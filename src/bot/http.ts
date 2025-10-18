//  src\http.ts
import { BiliApiResponse, MyInfoData, QrCodeData, QrCodePollResult, UploadImageData, WbiKeys, NavWbiImg, NewSessionsData, SessionMessagesData, BiliSendMessageResponseData, BilibiliCookie } from './types';
import { logInfo, loggerError, loggerInfo } from '../index';
import { BilibiliDmBot } from './bot';
import { Context, Quester } from 'koishi';
import { v4 as uuidv4 } from 'uuid';

import { createHash } from 'node:crypto';

const MIXIN_KEY_ENCODE_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];

export class HttpClient
{
  private cookies: BilibiliCookie = {} as BilibiliCookie;
  private biliJct: string = '';
  private readonly deviceId: string;
  private wbiKeys: WbiKeys | null = null;
  private wbiKeysTimestamp = 0;
  private wbiKeysFetchPromise: Promise<WbiKeys> | null = null; // 作为锁
  private avatarBase64: boolean;
  private selfId: string;
  private cookieVerified: boolean = false;

  public http: Quester;
  public isDisposed = false;

  private async safeRequest<T>(
    requestFn: () => Promise<T>,
    errorMessage: string,
    defaultValue: T
  ): Promise<T>
  {
    if (this.isDisposed)
    {
      logInfo(`HttpClient 实例已停用，跳过HTTP请求。`);
      return defaultValue;
    }

    try
    {
      try
      {
        // 尝试执行一个简单的操作来检查
        this.ctx.setTimeout(() => { }, 0);
      } catch (err)
      {
        if (err.code === 'INACTIVE_EFFECT')
        {
          logInfo(`上下文已不活跃，跳过HTTP请求`);
          this.isDisposed = true;
          return defaultValue;
        }
      }

      // 再次检查
      if (this.isDisposed)
      {
        logInfo(`HttpClient 实例已停用，跳过HTTP请求。`);
        return defaultValue;
      }

      // 执行实际请求
      try
      {
        return await requestFn();
      } catch (httpError)
      {
        if (httpError.message?.includes('context disposed') ||
          httpError.code === 'INACTIVE_EFFECT')
        {
          this.isDisposed = true;
          return defaultValue;
        }
        // 其他HTTP错误，继续抛出
        throw httpError;
      }
    } catch (error)
    {
      loggerError(`${errorMessage}: ${error.message}`);
      return defaultValue;
    }
  }

  constructor(private ctx: Context, config?: any, private bot?: BilibiliDmBot)
  {
    this.selfId = config?.selfId || (ctx.bilibili_dm_service)?.config?.selfId || 'unknown';
    const effectiveConfig = config || (ctx.bilibili_dm_service)?.config || {};
    this.avatarBase64 = effectiveConfig.avatarBase64 !== undefined ? effectiveConfig.avatarBase64 : true;

    logInfo(`HttpClient初始化，avatarBase64=${this.avatarBase64}`);
    logInfo(`HttpClient初始化，avatarBase64=${this.avatarBase64}, selfId=${this.selfId}`);
    this.http = ctx.http.extend({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://message.bilibili.com/',
        'Origin': 'https://message.bilibili.com',
      },
      timeout: 10000,
    });
    this.deviceId = this.generateDeviceId();

    ctx.on('dispose', () =>
    {
      this.isDisposed = true;
    });
  }

  setCookies(cookies: BilibiliCookie)
  {
    this.cookies = cookies;
    this.biliJct = cookies.bili_jct || '';
    const cookieString = Object.entries(cookies)
      .filter(([key]) => !key.startsWith('wbi_'))
      .map(([k, v]) => `${k}=${v}`).join('; ');

    if (this.http.config.headers)
    {
      (this.http.config.headers as Record<string, string>)['Cookie'] = cookieString;
    }

    if (cookies.wbi_img_key && cookies.wbi_sub_key && cookies.wbi_timestamp)
    {
      this.wbiKeys = {
        img_key: cookies.wbi_img_key,
        sub_key: cookies.wbi_sub_key,
      };
      this.wbiKeysTimestamp = cookies.wbi_timestamp;
    }

    logInfo(`成功设置cookie，长度: ${cookieString.length}`);
  }

  // 检查cookie是否已设置并验证
  hasCookies(): boolean
  {
    return this.cookieVerified || !!(this.cookies && this.cookies.SESSDATA && this.cookies.bili_jct);
  }

  // 设置cookie验证标志
  setCookieVerified(verified: boolean): void
  {
    this.cookieVerified = verified;
    logInfo(`Cookie验证状态设置为: ${verified}`);
  }

  // #region WBI Signing
  private getMixinKey(orig: string): string
  {
    let temp = '';
    MIXIN_KEY_ENCODE_TABLE.forEach((n) => { temp += orig[n]; });
    return temp.slice(0, 32);
  }

  public async getWbiKeys(): Promise<WbiKeys>
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    // Check memory cache.
    if (this.wbiKeys && this.wbiKeysTimestamp >= startOfToday)
    {
      return this.wbiKeys;
    }
    // Check file cache
    if (this.cookies.wbi_timestamp && this.cookies.wbi_img_key && this.cookies.wbi_sub_key && this.cookies.wbi_mixin_key)
    {
      if (this.cookies.wbi_timestamp >= startOfToday)
      {
        logInfo('从cookie文件加载WBI密钥');
        this.wbiKeys = {
          img_key: this.cookies.wbi_img_key,
          sub_key: this.cookies.wbi_sub_key,
        };
        this.wbiKeysTimestamp = this.cookies.wbi_timestamp;
        return this.wbiKeys;
      }
    }

    if (this.wbiKeysFetchPromise)
    {
      return this.wbiKeysFetchPromise;
    }

    this.wbiKeysFetchPromise = this.safeRequest(async () =>
    {
      logInfo('WBI密钥已过期或未找到，正在从API获取新密钥...');
      const res = await this.http.get<BiliApiResponse<{ wbi_img: NavWbiImg; }>>('https://api.bilibili.com/x/web-interface/nav', {
        headers: { 'Referer': 'https://www.bilibili.com/', 'Origin': 'https://www.bilibili.com' }
      });

      if (res.code === 0 && res.data?.wbi_img?.img_url && res.data?.wbi_img?.sub_url)
      {
        const imgKey = res.data.wbi_img.img_url.substring(res.data.wbi_img.img_url.lastIndexOf('/') + 1, res.data.wbi_img.img_url.lastIndexOf('.'));
        const subKey = res.data.wbi_img.sub_url.substring(res.data.wbi_img.sub_url.lastIndexOf('/') + 1, res.data.wbi_img.sub_url.lastIndexOf('.'));

        const mixinKey = this.getMixinKey(imgKey + subKey);

        this.wbiKeys = { img_key: imgKey, sub_key: subKey };
        const timestamp = Date.now();
        this.wbiKeysTimestamp = timestamp;

        this.cookies.wbi_img_key = imgKey;
        this.cookies.wbi_sub_key = subKey;
        this.cookies.wbi_mixin_key = mixinKey;
        this.cookies.wbi_timestamp = timestamp;

        if (this.bot)
        {
          await this.bot.saveCookie(this.cookies);
        }

        logInfo('WBI密钥获取并缓存成功。');
        return this.wbiKeys;
      }
      throw new Error(`Failed to get WBI keys: ${res.message || 'Invalid response data'}`);
    }, '获取WBI密钥时发生网络错误', null).finally(() =>
    {
      this.wbiKeysFetchPromise = null;
    });

    return this.wbiKeysFetchPromise;
  }

  private async signWithWbi(params: Record<string, any>): Promise<{ w_rid: string, wts: number; }>
  {
    await this.getWbiKeys();
    const mixinKey = this.cookies.wbi_mixin_key;
    if (!mixinKey)
    {
      throw new Error('无法获取 mixinKey，请检查 WBI 密钥是否正确获取和缓存');
    }
    const currTime = Math.round(Date.now() / 1000);

    const signedParams: Record<string, any> = { ...params, wts: currTime };
    const query = Object.keys(signedParams).sort().map(key =>
    {
      const value = signedParams[key]?.toString().replace(/[!'()*]/g, '') || '';
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }).join('&');

    const wbiSign = createHash('md5').update(query + mixinKey).digest('hex');
    return { w_rid: wbiSign, wts: currTime };
  }

  // 公共方法用于获取WBI签名
  async getWbiSignature(params: Record<string, any>): Promise<{ w_rid: string, wts: number; }>
  {
    return this.signWithWbi(params);
  }

  // 获取CSRF token
  getBiliJct(): string
  {
    return this.biliJct;
  }
  // #endregion

  // #region Login & Auth
  async getQrCodeData(): Promise<QrCodeData | null>
  {
    return this.safeRequest(async () =>
    {
      const res = await this.http.get<BiliApiResponse<QrCodeData>>('https://passport.bilibili.com/x/passport-login/web/qrcode/generate');
      if (res.code === 0 && res.data) return res.data;
      logInfo(`获取二维码失败: ${res.message}`);
      return null;
    }, '获取二维码数据时发生网络错误', null);
  }

  async pollQrCodeStatus(oauthKey: string): Promise<QrCodePollResult>
  {
    return this.safeRequest(async () =>
    {
      const res = await this.http.get<BiliApiResponse<{ url: string, refresh_token: string, timestamp: number, code: number, message: string; }>>(
        'https://passport.bilibili.com/x/passport-login/web/qrcode/poll',
        { params: { qrcode_key: oauthKey } }
      );
      const data = res.data;
      if (data.code === 0 && data.url)
      {
        const url = new URL(data.url);
        const SESSDATA = url.searchParams.get('SESSDATA');
        const bili_jct = url.searchParams.get('bili_jct');
        const DedeUserID = url.searchParams.get('DedeUserID');
        if (SESSDATA && bili_jct && DedeUserID)
        {
          return { status: 'success', message: '登录成功', cookies: { SESSDATA, bili_jct, DedeUserID } };
        }
        return { status: 'expired', message: 'Cookie 解析失败' };
      } else if (data.code === 86038) return { status: 'expired', message: '二维码已失效' };
      else if (data.code === 86090) return { status: 'scanned', message: '已扫描，待确认' };
      return { status: 'waiting', message: '等待扫描' };
    }, '[轮询] 轮询二维码状态时发生网络错误', { status: 'expired', message: '网络错误' });
  }

  async getMyInfo(): Promise<{ nickname: string, avatar: string, isValid: boolean; }>
  {
    return this.safeRequest(async () =>
    {
      logInfo(`正在验证cookie有效性，请求用户信息...`);
      const res = await this.http.get<BiliApiResponse<MyInfoData>>('https://api.bilibili.com/x/space/myinfo');

      if (res.code !== 0)
      {
        loggerError(`验证cookie失败，API返回错误: `, res);
        this.setCookieVerified(false);
        return { nickname: '', avatar: '', isValid: false };
      }

      if (res.code === 0 && res.data)
      {
        logInfo(`验证cookie成功，用户名: ${res.data.name}`);
        this.setCookieVerified(true);

        let avatarUrl = res.data.face;
        if (this.avatarBase64)
        {
          try
          {
            const avatarFiledata = await this.safeFileRequest(
              res.data.face,
              '获取头像文件失败'
            );

            if (avatarFiledata)
            {
              const avatarBuffer = avatarFiledata.data;
              const avatarMimeType = avatarFiledata.type || avatarFiledata.mime;
              const base64 = Buffer.from(avatarBuffer).toString('base64');
              avatarUrl = `data:${avatarMimeType};base64,${base64}`;
              logInfo(`成功获取头像并转换为base64格式，用户: ${res.data.name}, 头像URL: ${res.data.face.substring(0, 50)}...`);
            } else
            {
              loggerError(`获取头像失败，数据返回null。使用原始URL: ${res.data.face} `);
            }
          } catch (avatarError)
          {
            loggerError('获取头像失败，使用原始URL:', avatarError);
          }
        }
        return { nickname: res.data.name, avatar: avatarUrl, isValid: true };
      }
      this.setCookieVerified(false);
      return { nickname: '', avatar: '', isValid: false };
    }, '验证Cookie失败', { nickname: '', avatar: '', isValid: false });
  }
  // #endregion

  async getUser(userId: string): Promise<{ nickname: string, avatar: string; } | null>
  {
    return this.safeRequest(async () =>
    {
      const baseParams = { mid: userId };
      const signedParams = await this.signWithWbi(baseParams);

      interface UserInfoResponseData
      {
        name: string;
        face: string;
      }
      const res = await this.http.get<BiliApiResponse<UserInfoResponseData>>(
        'https://api.bilibili.com/x/space/wbi/acc/info',
        { params: { ...baseParams, ...signedParams } }
      );

      if (res.code === 0 && res.data)
      {
        return { nickname: res.data.name, avatar: res.data.face };
      }

      loggerError(`获取B站用户 ${userId} 信息失败: `, res);
      return null;
    }, `获取B站用户 ${userId} 信息时发生网络错误`, null);
  }

  // #region Private Message API
  async getNewSessions(begin_ts: number): Promise<NewSessionsData | null>
  {
    // 检查cookie是否存在
    if (!this.cookies || !this.cookies.SESSDATA || !this.cookies.bili_jct || !this.cookieVerified)
    {
      loggerError(`轮询新会话失败: 未设置cookie或cookie无效`);
      return null;
    }

    return this.safeRequest(async () =>
    {
      const res = await this.http.get<BiliApiResponse<NewSessionsData>>(
        'https://api.vc.bilibili.com/session_svr/v1/session_svr/new_sessions',
        {
          params: { begin_ts, build: 0, mobi_app: 'web' },
          headers: {
            'Cookie': Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ')
          }
        }
      );
      if (res.code === 0) return res.data;
      loggerError(`轮询新会话失败: `, res);
      return null;
    }, `轮询新会话时发生网络错误`, null);
  }

  async fetchSessionMessages(talker_id: number, session_type: number, begin_seqno: number): Promise<SessionMessagesData | null>
  {
    // 检查cookie是否已验证
    if (!this.cookieVerified)
    {
      loggerError(`获取消息失败: 未设置cookie或cookie无效`);
      return null;
    }

    // 检查cookie是否存在
    if (!this.cookies || !this.cookies.SESSDATA || !this.cookies.bili_jct)
    {
      loggerError(`获取消息失败: 未设置cookie或cookie无效`);
      return null;
    }

    logInfo(`正在获取用户 ${talker_id} 在时间戳 ${begin_seqno} 之后的消息`);
    return this.safeRequest(async () =>
    {
      const httpResponse = await this.http.get<BiliApiResponse<SessionMessagesData>>(
        'https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs',
        {
          params: {
            talker_id,
            session_type,
            begin_seqno,
            size: 20,
            build: 0,
            mobi_app: 'web'
          },
          headers: {
            'Cookie': Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ')
          },
          responseType: 'text', // 确保获取原始文本
        }
      );

      const resText = httpResponse as unknown as string; // 强制转为 string
      let res: BiliApiResponse<SessionMessagesData>;
      try
      {
        const transformedResText = resText.replace(/"msg_key":(\d+)/g, '"msg_key":"$1"');
        res = JSON.parse(transformedResText);
      } catch (e)
      {
        loggerError(`fetchSessionMessages JSON parse error: ${e.message}, raw: ${resText}`);
        return null;
      }

      if (res.code === 0) return res.data;
      logInfo(`获取用户 ${talker_id} 的消息失败: ${res.message} (错误码: ${res.code})`);
      return null;
    }, `获取用户 ${talker_id} 的消息时发生网络错误`, null);
  }

  async updateAck(talker_id: number, session_type: number, ack_seqno: number): Promise<void>
  {
    return this.safeRequest(async () =>
    {
      await this.http.post(
        'https://api.vc.bilibili.com/session_svr/v1/session_svr/update_ack',
        new URLSearchParams({
          talker_id: talker_id.toString(),
          session_type: session_type.toString(),
          ack_seqno: ack_seqno.toString(),
          build: '0',
          mobi_app: 'web',
          csrf: this.biliJct,
          csrf_token: this.biliJct
        })
      );
      logInfo(`已将用户 ${talker_id} 的会话标记为已读，直到时间戳 ${ack_seqno}`);
    }, `将用户 ${talker_id} 的会话标记为已读失败`, undefined);
  }

  async uploadImage(imageBuffer: Buffer): Promise<UploadImageData | null>
  {
    const boundary = `----WebKitFormBoundary${uuidv4().replace(/-/g, '')}`;
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file_up"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="biz"\r\n\r\n`),
      Buffer.from('im'),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="csrf"\r\n\r\n`),
      Buffer.from(this.biliJct),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    return this.safeRequest(async () =>
    {
      const res = await this.http.post<BiliApiResponse<UploadImageData>>(
        'https://api.bilibili.com/x/dynamic/feed/draw/upload_bfs',
        payload,
        { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } }
      );
      if (res.code === 0 && res.data) return res.data;
      logInfo('上传图片失败:', res.message);
      return null;
    }, '上传图片时发生网络错误', null);
  }

  async sendMessage(senderUid: string, receiverId: number, msgContent: string, msgType: 1 | 2 | 5): Promise<string | null>
  {
    // logInfo(`sendMessage: msgType=${msgType}, msgContent=${msgContent}`);
    const msgObject = {
      sender_uid: senderUid,
      receiver_id: receiverId,
      receiver_type: 1,
      msg_type: msgType,
      msg_status: 0,
      content: msgContent,
      timestamp: Math.floor(Date.now() / 1000),
      dev_id: this.deviceId,
      new_face_version: 1,
    };

    const formPayload = new URLSearchParams({
      'msg[sender_uid]': msgObject.sender_uid.toString(),
      'msg[receiver_id]': msgObject.receiver_id.toString(),
      'msg[receiver_type]': msgObject.receiver_type.toString(),
      'msg[msg_type]': msgObject.msg_type.toString(),
      'msg[msg_status]': msgObject.msg_status.toString(),
      'msg[content]': msgObject.content,
      'msg[timestamp]': msgObject.timestamp.toString(),
      'msg[dev_id]': msgObject.dev_id,
      'msg[new_face_version]': msgObject.new_face_version.toString(),
      'build': '0',
      'mobi_app': 'web',
      'csrf_token': this.biliJct,
      'csrf': this.biliJct,
    }).toString();
    // logInfo(`sendMessage: formPayload=${formPayload}`);

    return this.safeRequest(async () =>
    {
      const urlParams = await this.signWithWbi({
        'w_sender_uid': senderUid,
        'w_receiver_id': receiverId,
        'w_dev_id': this.deviceId,
      }) as Record<string, any>;

      const apiUrl = 'https://api.vc.bilibili.com/web_im/v1/web_im/send_msg';

      const fullUrl = `${apiUrl}?${new URLSearchParams(urlParams).toString()}`;
      logInfo(fullUrl);
      const httpResponse = await this.http.post<BiliApiResponse<BiliSendMessageResponseData>>(
        apiUrl,
        formPayload,
        {
          params: urlParams,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://message.bilibili.com/h5',
            'Origin': 'https://message.bilibili.com',
          },
          responseType: 'text',
        }
      );

      const resText = httpResponse as unknown as string; // 强制转为 string
      logInfo(`sendMessage raw response text: ${resText}`);

      let res: BiliApiResponse<BiliSendMessageResponseData>;
      try
      {
        // 在 JSON.parse 之前，使用正则表达式将 msg_key 的数字值用引号括起来
        // 否则后三位会变成 0
        const transformedResText = resText.replace(/"msg_key":(\d+)/g, '"msg_key":"$1"');
        res = JSON.parse(transformedResText);
      } catch (e)
      {
        loggerError(`sendMessage JSON parse error: ${e.message}, raw: ${resText}`);
        return null;
      }

      if (res.code === 0)
      {
        logInfo(`成功发送消息给 ${receiverId} (msg_key: ${res.data?.msg_key})`);
        return res.data?.msg_key || null;
      }

      if (res.code === 21020)
      {
        logInfo(`发送消息给 ${receiverId} 失败: 频率过快，请稍后再发 (code: ${res.code})`);
      } else if (res.code === 10005)
      {
        logInfo(`发送消息给 ${receiverId} 失败: 消息ID不存在 (code: ${res.code})`);
      } else
      {
        logInfo(`发送消息给 ${receiverId} 失败: ${res.message || res.msg} (code: ${res.code})`);
      }

      return null;
    }, `发送消息给 ${receiverId} 失败`, null);
  }
  // #endregion

  /**
   * 当做 ctx.http.file
   * @param url 文件URL
   * @param errorMessage 错误时的日志消息
   * @returns 文件数据或null
   */
  public async safeFileRequest(
    url: string,
    errorMessage: string
  ): Promise<{ data: Buffer, type: string, name: string, mime: string; } | null>
  {
    const fileResponse = await this.safeRequest(
      () => this.ctx.http.file(url),
      errorMessage,
      null
    );

    if (fileResponse)
    {
      // 将 ArrayBuffer 转换为 Buffer
      const bufferData = Buffer.from(fileResponse.data);
      return {
        data: bufferData,
        type: fileResponse.type,
        name: fileResponse.filename,
        mime: fileResponse.mime,
      };
    }
    return null;
  }

  private generateDeviceId(): string
  {
    return uuidv4().toUpperCase();
  }
}
