// src\bilibiliAPI\apis\search.ts
import { BilibiliDmBot } from '../../bot/bot';
import { logInfo, loggerError } from '../../index';
import
{
  BilibiliResponse,
  SearchUser,
  SearchVideo,
  SearchLiveRoom,
  SearchLiveUser,
  SearchArticle,
  ComprehensiveSearchResponse,
  TypeSearchResponse,
  SearchOptions
} from './types';

export class SearchAPI
{
  private bot: BilibiliDmBot;

  constructor(bot: BilibiliDmBot)
  {
    this.bot = bot;
  }

  /**
   * 综合搜索
   * @param keyword 搜索关键词
   * @returns Promise<ComprehensiveSearchResponse | null>
   */
  async comprehensiveSearch(keyword: string): Promise<ComprehensiveSearchResponse | null>
  {
    try
    {
      logInfo(`开始综合搜索: ${keyword}`);

      const res: BilibiliResponse<ComprehensiveSearchResponse> = await this.bot.http.http.get(
        'https://api.bilibili.com/x/web-interface/wbi/search/all/v2',
        {
          params: {
            keyword: keyword
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': 'https://search.bilibili.com/'
          }
        }
      );

      if (res.code === 0 && res.data)
      {
        logInfo(`综合搜索成功，找到 ${res.data.numResults} 条结果`);
        return res.data;
      } else
      {
        loggerError(`综合搜索失败: ${res.message} (Code: ${res.code})`);
        return null;
      }
    } catch (error)
    {
      loggerError(`综合搜索时发生错误: `, error);
      return null;
    }
  }

  /**
   * 搜索用户
   * @param keyword 搜索关键词
   * @param options 搜索选项
   * @returns Promise<SearchUser[]>
   */
  async searchUsers(keyword: string, options: SearchOptions = {}): Promise<SearchUser[]>
  {
    try
    {
      logInfo(`开始搜索用户: ${keyword}`);

      const params: any = {
        search_type: 'bili_user',
        keyword: keyword,
        page: options.page || 1
      };

      if (options.userOrder)
      {
        params.order = options.userOrder;
      }
      if (options.orderSort !== undefined)
      {
        params.order_sort = options.orderSort;
      }
      if (options.userType !== undefined)
      {
        params.user_type = options.userType;
      }

      const res: BilibiliResponse<TypeSearchResponse> = await this.bot.http.http.get(
        'https://api.bilibili.com/x/web-interface/wbi/search/type',
        {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': 'https://search.bilibili.com/'
          }
        }
      );

      if (res.code === 0 && res.data && Array.isArray(res.data.result))
      {
        const users = res.data.result as SearchUser[];
        logInfo(`用户搜索成功，找到 ${users.length} 个用户`);
        return users;
      } else
      {
        loggerError(`用户搜索失败: ${res.message} (Code: ${res.code})`);
        return [];
      }
    } catch (error)
    {
      loggerError(`搜索用户时发生错误: `, error);
      return [];
    }
  }

  /**
   * 搜索视频
   * @param keyword 搜索关键词
   * @param options 搜索选项
   * @returns Promise<SearchVideo[]>
   */
  async searchVideos(keyword: string, options: SearchOptions = {}): Promise<SearchVideo[]>
  {
    try
    {
      logInfo(`开始搜索视频: ${keyword}`);

      const params: any = {
        search_type: 'video',
        keyword: keyword,
        page: options.page || 1
      };

      if (options.order)
      {
        params.order = options.order;
      }
      if (options.duration !== undefined)
      {
        params.duration = options.duration;
      }
      if (options.tids !== undefined)
      {
        params.tids = options.tids;
      }

      const res: BilibiliResponse<TypeSearchResponse> = await this.bot.http.http.get(
        'https://api.bilibili.com/x/web-interface/wbi/search/type',
        {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': 'https://search.bilibili.com/'
          }
        }
      );

      if (res.code === 0 && res.data && Array.isArray(res.data.result))
      {
        const videos = res.data.result as SearchVideo[];
        logInfo(`视频搜索成功，找到 ${videos.length} 个视频`);
        return videos;
      } else
      {
        loggerError(`视频搜索失败: ${res.message} (Code: ${res.code})`);
        return [];
      }
    } catch (error)
    {
      loggerError(`搜索视频时发生错误: `, error);
      return [];
    }
  }

  /**
   * 搜索直播间和主播
   * @param keyword 搜索关键词
   * @param options 搜索选项
   * @returns Promise<{liveRooms: SearchLiveRoom[], liveUsers: SearchLiveUser[]}>
   */
  async searchLive(keyword: string, options: SearchOptions = {}): Promise<{
    liveRooms: SearchLiveRoom[];
    liveUsers: SearchLiveUser[];
  }>
  {
    try
    {
      logInfo(`开始搜索直播: ${keyword}`);

      const params: any = {
        search_type: 'live',
        keyword: keyword,
        page: options.page || 1
      };

      const res: BilibiliResponse<TypeSearchResponse> = await this.bot.http.http.get(
        'https://api.bilibili.com/x/web-interface/wbi/search/type',
        {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': 'https://search.bilibili.com/'
          }
        }
      );

      if (res.code === 0 && res.data && typeof res.data.result === 'object')
      {
        const result = res.data.result as { live_room?: SearchLiveRoom[], live_user?: SearchLiveUser[]; };
        const liveRooms = result.live_room || [];
        const liveUsers = result.live_user || [];

        logInfo(`直播搜索成功，找到 ${liveRooms.length} 个直播间，${liveUsers.length} 个主播`);
        return { liveRooms, liveUsers };
      } else
      {
        loggerError(`直播搜索失败: ${res.message} (Code: ${res.code})`);
        return { liveRooms: [], liveUsers: [] };
      }
    } catch (error)
    {
      loggerError(`搜索直播时发生错误: `, error);
      return { liveRooms: [], liveUsers: [] };
    }
  }

  /**
   * 搜索专栏
   * @param keyword 搜索关键词
   * @param options 搜索选项
   * @returns Promise<SearchArticle[]>
   */
  async searchArticles(keyword: string, options: SearchOptions = {}): Promise<SearchArticle[]>
  {
    try
    {
      logInfo(`开始搜索专栏: ${keyword}`);

      const params: any = {
        search_type: 'article',
        keyword: keyword,
        page: options.page || 1
      };

      if (options.order)
      {
        params.order = options.order;
      }
      if (options.categoryId !== undefined)
      {
        params.category_id = options.categoryId;
      }

      const res: BilibiliResponse<TypeSearchResponse> = await this.bot.http.http.get(
        'https://api.bilibili.com/x/web-interface/wbi/search/type',
        {
          params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Referer': 'https://search.bilibili.com/'
          }
        }
      );

      if (res.code === 0 && res.data && Array.isArray(res.data.result))
      {
        const articles = res.data.result as SearchArticle[];
        logInfo(`专栏搜索成功，找到 ${articles.length} 篇专栏`);
        return articles;
      } else
      {
        loggerError(`专栏搜索失败: ${res.message} (Code: ${res.code})`);
        return [];
      }
    } catch (error)
    {
      loggerError(`搜索专栏时发生错误: `, error);
      return [];
    }
  }

  /**
   * 根据用户名搜索用户（便捷方法）
   * @param username 用户名
   * @param exactMatch 是否精确匹配
   * @returns Promise<SearchUser[]>
   */
  async searchUsersByName(username: string, exactMatch: boolean = false): Promise<SearchUser[]>
  {
    const users = await this.searchUsers(username, {
      userOrder: 'fans', // 按粉丝数排序
      orderSort: 0 // 从高到低
    });

    if (exactMatch)
    {
      // 精确匹配用户名
      return users.filter(user => user.uname.toLowerCase() === username.toLowerCase());
    }

    return users;
  }

  /**
   * 搜索UP主（只返回UP主用户）
   * @param keyword 搜索关键词
   * @param options 搜索选项
   * @returns Promise<SearchUser[]>
   */
  async searchUpUsers(keyword: string, options: SearchOptions = {}): Promise<SearchUser[]>
  {
    return this.searchUsers(keyword, {
      ...options,
      userType: 1 // 只搜索UP主
    });
  }
}