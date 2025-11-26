//  src\service.ts
import { BotStatus, logInfo, loggerError, loggerInfo } from '../index';
import { BilibiliCookie, PluginConfig } from './types';
import { BilibiliDmBot } from './bot';
import { Context } from 'koishi';
import QRCode from 'qrcode';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getDataFilePath } from './utils';

export class BilibiliService
{
  private status: Record<string, BotStatus> = {};
  private isDisposed = false;
  public config: PluginConfig;
  private launcher: any; // BilibiliLauncher 实例引用

  constructor(private ctx: Context, config: PluginConfig)
  {
    this.config = config;

    ctx.on('dispose', () =>
    {
      this.isDisposed = true;
      loggerInfo(`正在关闭连接 Bilibili ...`);
      delete this.status[this.config.selfId];
      logInfo(`已从服务状态中移除`);
    });
  }

  // 设置 launcher 引用
  setLauncher(launcher: any): void
  {
    this.launcher = launcher;
    logInfo(`BilibiliService 已关联 launcher 实例`);
  }

  getStatus(): Record<string, BotStatus>
  {
    return this.status;
  }

  markAsDisposed(): void
  {
    this.isDisposed = true;
    logInfo('服务已标记为已停用状态');
  }

  updateStatus(selfId: string, status: Partial<BotStatus>)
  {
    if (this.isDisposed) return;
    if (!selfId)
    {
      logInfo('updateStatus: selfId为空，无法更新状态');
      return;
    }

    logInfo(`更新状态前: ${JSON.stringify(this.status[selfId]?.status)}, 更新为: ${JSON.stringify(status.status)}`);

    this.status[selfId] = {
      ...(this.status[selfId] || { status: 'init', selfId }),
      ...status,
      selfId: selfId,
    };

    // 直接调用 launcher 的 updateStatus 方法更新前端
    if (this.launcher && typeof this.launcher.updateStatus === 'function')
    {
      logInfo(`直接调用 launcher.updateStatus 更新前端`);
      this.launcher.updateStatus(this.status[selfId]);
    } else
    {
      logInfo(`launcher 未设置或不可用，跳过前端更新`);
    }
  }

  async saveCookie(selfId: string, cookieData: BilibiliCookie)
  {
    if (this.isDisposed) return;
    try
    {
      const sessionFile = getDataFilePath(this.ctx, selfId, `${selfId}.cookie.json`);
      await writeFile(sessionFile, JSON.stringify(cookieData, null, 2), 'utf8');
      logInfo(`Cookie data for ${selfId} saved to ${sessionFile}`);
    } catch (error)
    {
      loggerError(`Failed to save cookie for ${selfId}:`, error);
    }
  }

  async startLogin(bot: BilibiliDmBot, sessionFile: string): Promise<boolean>
  {
    const selfId = bot.selfId;

    try
    {
      if (!this.status[selfId])
      {
        logInfo(`创建新的状态对象，因为当前状态中不存在此selfId`);
        this.status[selfId] = {
          status: 'init',
          selfId: selfId,
          message: '正在初始化...'
        };
      }

      logInfo(`开始startLogin过程，尝试登录...`);
      this.updateStatus(selfId, {
        status: 'init',
        selfId: selfId,
        message: '正在初始化登录...'
      });

      const fileExists = existsSync(sessionFile);
      logInfo(`检查缓存文件: ${sessionFile}，存在: ${fileExists}`);
      if (fileExists)
      {
        logInfo(`发现缓存文件: ${sessionFile}，尝试使用缓存登录`);
        try
        {
          const cookieData = JSON.parse(await readFile(sessionFile, 'utf8'));
          logInfo(`成功读取缓存数据，设置cookies，数据长度: ${JSON.stringify(cookieData).length}`);
          bot.http.setCookies(cookieData);

          logInfo(`验证cookie有效性...`);
          const userInfo = await bot.http.getMyInfo();
          logInfo(`Cookie验证结果: ${userInfo.isValid ? '有效' : '无效'}，用户名: ${userInfo.nickname}`);
          if (userInfo.isValid)
          {
            this.updateStatus(selfId, {
              status: 'success',
              selfId: selfId,
              message: `已使用缓存登录，欢迎回来，${userInfo.nickname} ！`
            });
            bot.user.name = userInfo.nickname;
            bot.user.username = userInfo.nickname;
            bot.user.nick = userInfo.nickname;
            bot.user.avatar = userInfo.avatar;

            loggerInfo(`已使用缓存登录，欢迎回来，${userInfo.nickname} ！`);

            logInfo(`登录成功，设置cookie并启动机器人`);

            bot.http.setCookieVerified(true);
            logInfo(`已设置cookie验证标志为true`);

            await new Promise(resolve => setTimeout(resolve, 1000));

            await bot.start();
            bot.online();

            // 登录成功后立即更新WBI密钥
            await bot.http.getWbiKeys();

            return true;
          } else
          {
            this.updateStatus(selfId, {
              status: 'continue',
              selfId: selfId,
              message: '缓存的登录信息已失效，需要重新登录'
            });
          }
        } catch (error)
        {
          loggerError(`无法加载缓存的登录信息，错误详情: `, error);
          this.updateStatus(selfId, {
            status: 'continue',
            message: '无法加载缓存的登录信息，需要重新登录'
          });
        }
      } else
      {
        logInfo(`未找到缓存文件: ${sessionFile}，需要扫码登录`);
        logInfo(`未找到缓存文件，将进入扫码登录流程`);

        this.updateStatus(selfId, {
          status: 'offline',
          selfId: selfId,
          message: '未找到缓存文件，需要扫码登录'
        });
      }

      const qrData = await bot.http.getQrCodeData();
      if (!qrData)
      {
        if (this.isDisposed || bot.http.isDisposed)
        {
          logInfo(`上下文已停用，无法获取二维码数据`);
          this.updateStatus(selfId, {
            status: 'error',
            message: '插件已停用，无法获取二维码'
          });
          return false;
        } else
        {
          logInfo(`获取二维码失败，但不是因为上下文停用`);
          this.updateStatus(selfId, {
            status: 'error',
            message: '获取二维码失败，请稍后重试'
          });
          return false;
        }
      }

      try
      {
        const qrImageBase64 = await QRCode.toDataURL(qrData.url, {
          margin: 1,
          scale: 8,
          errorCorrectionLevel: 'H'
        });

        logInfo(`生成二维码成功，URL: ${qrData.url}`);
        logInfo(`二维码图片数据长度: ${qrImageBase64.length} 字节`);

        if (!qrImageBase64.startsWith('data:image/'))
        {
          throw new Error('生成的二维码数据格式不正确');
        }

        this.updateStatus(selfId, {
          status: 'qrcode',
          message: '请使用 Bilibili APP 扫描二维码登录',
          image: qrImageBase64
        });

        logInfo(`已更新状态为等待扫码，二维码已准备好在WebUI中显示`);
        logInfo(`请在WebUI中查看登录二维码`);
      } catch (error)
      {
        loggerError(`生成二维码图片失败: `, error);
        this.updateStatus(selfId, {
          status: 'error',
          message: `生成二维码失败: ${error.message || '未知错误'}`
        });
        throw error;
      }

      let retryCount = 0;
      const maxRetries = 60;

      while (retryCount < maxRetries && !this.isDisposed)
      {
        const pollResult = await bot.http.pollQrCodeStatus(qrData.qrcode_key);

        if (pollResult.status === 'success' && pollResult.cookies)
        {
          logInfo(`二维码登录成功，设置cookie`);
          const newCookie: BilibiliCookie = {
            SESSDATA: pollResult.cookies.SESSDATA,
            bili_jct: pollResult.cookies.bili_jct,
            DedeUserID: pollResult.cookies.DedeUserID,
          };
          bot.http.setCookies(newCookie);
          await this.saveCookie(selfId, newCookie);

          bot.http.setCookieVerified(true);
          logInfo(`已设置cookie验证标志为true`);

          const userInfo = await bot.http.getMyInfo();

          this.updateStatus(selfId, {
            status: 'success',
            selfId: selfId,
            message: `登录成功，欢迎 ${userInfo.nickname} ！`
          });

          bot.user.name = userInfo.nickname;
          bot.user.username = userInfo.nickname;
          bot.user.nick = userInfo.nickname;
          bot.user.avatar = userInfo.avatar;

          loggerInfo(`已使用缓存登录，欢迎回来，${userInfo.nickname} ！`);

          await bot.start();
          bot.online();

          // 登录成功后立即更新WBI密钥
          await bot.http.getWbiKeys();

          return true;
        } else if (pollResult.status === 'scanned')
        {
          this.updateStatus(selfId, {
            status: 'continue',
            message: '二维码已扫描，请在手机上确认登录'
          });
        } else if (pollResult.status === 'expired')
        {
          this.updateStatus(selfId, {
            status: 'error',
            message: '二维码已过期，请刷新页面重试'
          });
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        retryCount++;
      }

      this.updateStatus(selfId, {
        status: 'error',
        message: '登录超时，请刷新页面重试'
      });
      return false;

    } catch (error)
    {
      loggerError(`登录过程中发生错误: `, error);
      this.updateStatus(selfId, {
        status: 'error',
        message: `登录失败: ${error.message || '未知错误'}`
      });
      return false;
    }
  }
}
