import { BilibiliDmBot } from '../bot/bot'
import { Context } from 'koishi'
import { DynamicAPI } from './apis/dynamic'
import { UserAPI } from './apis/user'
import { SearchAPI } from './apis/search'
import { LiveAPI } from './apis/live'
import {
    DynamicItem,
    FollowingUser,
    InternalInterface,
    SearchUser,
    SearchVideo,
    SearchLiveRoom,
    SearchLiveUser,
    SearchArticle,
    ComprehensiveSearchResponse,
    SearchOptions
} from './apis/types'

export class Internal implements InternalInterface {
    private bot: BilibiliDmBot
    private ctx: Context
    private dynamicAPI: DynamicAPI
    private userAPI: UserAPI
    private searchAPI: SearchAPI
    private liveAPI: LiveAPI

    constructor(bot: BilibiliDmBot, ctx: Context) {
        this.bot = bot
        this.ctx = ctx
        this.dynamicAPI = new DynamicAPI(bot, ctx)
        this.userAPI = new UserAPI(bot)
        this.searchAPI = new SearchAPI(bot)
        this.liveAPI = new LiveAPI(bot, ctx)
    }

    // #region 用户关注相关API

    /**
     * 关注指定 UP 主
     * @param uid UP 主的 UID
     * @returns Promise<boolean> 是否成功关注
     */
    async followUser(uid: string): Promise<boolean> {
        return this.userAPI.followUser(uid)
    }

    /**
     * 取消关注指定 UP 主
     * @param uid UP 主的 UID
     * @returns Promise<boolean> 是否成功取消关注
     */
    async unfollowUser(uid: string): Promise<boolean> {
        return this.userAPI.unfollowUser(uid)
    }

    /**
     * 获取关注的用户列表
     * @param maxPages 最大页数，默认10页
     * @returns Promise<FollowingUser[]> 关注的用户列表
     */
    async getFollowedUsers(maxPages?: number): Promise<FollowingUser[]> {
        return this.userAPI.getFollowedUsers(maxPages)
    }

    /**
     * 获取用户信息
     * @param uid 用户UID
     * @returns Promise<any> 用户信息
     */
    async getUserInfo(uid: string): Promise<any> {
        return this.userAPI.getUserInfo(uid)
    }

    /**
     * 检查是否关注了指定用户
     * @param uid 用户UID
     * @returns Promise<boolean> 是否已关注
     */
    async isFollowing(uid: string): Promise<boolean> {
        return this.userAPI.isFollowing(uid)
    }

    /**
     * 批量检查关注状态
     * @param uids 用户UID列表
     * @returns Promise<Record<string, boolean>> UID到关注状态的映射
     */
    async batchCheckFollowing(uids: string[]): Promise<Record<string, boolean>> {
        return this.userAPI.batchCheckFollowing(uids)
    }

    // #region 动态相关API

    /**
     * 获取指定 UP 主的动态
     * @param uid UP 主的 UID
     * @param offset 分页偏移量
     * @returns Promise<DynamicItem[]> 指定 UP 主的动态列表
     */
    async getPersonalDynamics(uid: string, offset?: string): Promise<DynamicItem[]> {
        return this.dynamicAPI.getPersonalDynamics(uid, offset)
    }

    /**
     * 获取动态详情
     * @param dynamicId 动态 ID
     * @returns Promise<DynamicItem | null> 动态详情
     */
    async getDynamicDetail(dynamicId: string): Promise<DynamicItem | null> {
        return this.dynamicAPI.getDynamicDetail(dynamicId)
    }

    /**
     * 获取所有关注的 UP 主的动态
     * @param offset 分页偏移量
     * @param updateBaseline 更新基线
     * @returns Promise<DynamicItem[]> 所有关注的 UP 主的动态列表
     */
    async getAllFollowedDynamics(offset?: string, updateBaseline?: string): Promise<DynamicItem[]> {
        return this.dynamicAPI.getAllFollowedDynamics(offset, updateBaseline)
    }

    // #region 动态监听相关API

    /**
     * 开始监听动态更新
     * @param interval 轮询间隔（毫秒），默认30秒
     */
    startDynamicPolling(interval: number = 30000): void {
        this.dynamicAPI.startDynamicPolling(interval)
    }

    /**
     * 停止监听动态更新
     */
    stopDynamicPolling(): void {
        this.dynamicAPI.stopDynamicPolling()
    }

    /**
     * 获取监听状态
     */
    isPollingActive(): boolean {
        return this.dynamicAPI.isPollingActive()
    }

    /**
     * 设置轮询间隔
     */
    setPollInterval(interval: number): void {
        this.dynamicAPI.setPollInterval(interval)
    }

    /**
     * 获取当前基线
     */
    getCurrentBaseline(): string {
        return this.dynamicAPI.getCurrentBaseline()
    }

    /**
     * 设置基线
     */
    setBaseline(baseline: string): void {
        this.dynamicAPI.setBaseline(baseline)
    }

    // #region 搜索相关API

    /**
     * 综合搜索
     * @param keyword 搜索关键词
     * @returns Promise<ComprehensiveSearchResponse | null> 搜索结果
     */
    async comprehensiveSearch(keyword: string): Promise<ComprehensiveSearchResponse | null> {
        return this.searchAPI.comprehensiveSearch(keyword)
    }

    /**
     * 搜索用户
     * @param keyword 搜索关键词
     * @param options 搜索选项
     * @returns Promise<SearchUser[]> 用户搜索结果
     */
    async searchUsers(keyword: string, options?: SearchOptions): Promise<SearchUser[]> {
        return this.searchAPI.searchUsers(keyword, options)
    }

    /**
     * 搜索视频
     * @param keyword 搜索关键词
     * @param options 搜索选项
     * @returns Promise<SearchVideo[]> 视频搜索结果
     */
    async searchVideos(keyword: string, options?: SearchOptions): Promise<SearchVideo[]> {
        return this.searchAPI.searchVideos(keyword, options)
    }

    /**
     * 搜索直播间和主播
     * @param keyword 搜索关键词
     * @param options 搜索选项
     * @returns Promise<{liveRooms: SearchLiveRoom[], liveUsers: SearchLiveUser[]}> 直播搜索结果
     */
    async searchLive(keyword: string, options?: SearchOptions): Promise<{ liveRooms: SearchLiveRoom[], liveUsers: SearchLiveUser[] }> {
        return this.searchAPI.searchLive(keyword, options)
    }

    /**
     * 搜索专栏
     * @param keyword 搜索关键词
     * @param options 搜索选项
     * @returns Promise<SearchArticle[]> 专栏搜索结果
     */
    async searchArticles(keyword: string, options?: SearchOptions): Promise<SearchArticle[]> {
        return this.searchAPI.searchArticles(keyword, options)
    }

    /**
     * 根据用户名搜索用户
     * @param username 用户名
     * @param exactMatch 是否精确匹配
     * @returns Promise<SearchUser[]> 用户搜索结果
     */
    async searchUsersByName(username: string, exactMatch?: boolean): Promise<SearchUser[]> {
        return this.searchAPI.searchUsersByName(username, exactMatch)
    }

    /**
     * 搜索UP主
     * @param keyword 搜索关键词
     * @param options 搜索选项
     * @returns Promise<SearchUser[]> UP主搜索结果
     */
    async searchUpUsers(keyword: string, options?: SearchOptions): Promise<SearchUser[]> {
        return this.searchAPI.searchUpUsers(keyword, options)
    }

    // #region 直播相关API

    /**
     * 获取当前正在直播的UP主列表
     * @returns Promise<any[]> 正在直播的UP主列表
     */
    async getLiveUsers(): Promise<any[]> {
        return this.liveAPI.getLiveUsers()
    }

    /**
     * 开始监听直播状态更新
     * @param interval 轮询间隔（毫秒），默认30秒
     */
    startLivePolling(interval: number = 30000): void {
        this.liveAPI.startLivePolling(interval)
    }

    /**
     * 停止监听直播状态更新
     */
    stopLivePolling(): void {
        this.liveAPI.stopLivePolling()
    }

    /**
     * 获取直播监听状态
     */
    isLivePollingActive(): boolean {
        return this.liveAPI.isPollingActive()
    }

    /**
     * 设置直播轮询间隔
     */
    setLivePollInterval(interval: number): void {
        this.liveAPI.setPollInterval(interval)
    }

    /**
     * 获取当前直播用户摘要（用于调试）
     */
    getCurrentLiveUsersSummary(): any[] {
        return this.liveAPI.getCurrentLiveUsersSummary()
    }

    /**
     * 手动触发一次直播状态检查
     */
    async manualLiveCheck(): Promise<void> {
        return this.liveAPI.manualCheck()
    }

    /**
     * 获取指定UP主的直播状态
     */
    async getUserLiveStatus(mid: number): Promise<any> {
        return this.liveAPI.getUserLiveStatus(mid)
    }

    /**
     * 检查指定UP主是否正在直播
     */
    async isUserLive(mid: number): Promise<boolean> {
        return this.liveAPI.isUserLive(mid)
    }

}
