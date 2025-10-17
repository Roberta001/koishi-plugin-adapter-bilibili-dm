// src\bilibiliAPI\apis\video.ts
import { BilibiliDmBot } from '../../bot/bot'
import { logInfo, loggerError } from '../../index'
import {
    VideoData,
    VideoInfoResponse,
    BilibiliError,
    ExternalParseResponse
} from './types'

export class VideoAPI {
    private bot: BilibiliDmBot

    constructor(bot: BilibiliDmBot) {
        this.bot = bot
    }

    /**
     * 解析视频信息，获取视频aid、cid等详细信息
     * @param bvid 视频BV号
     * @returns Promise<VideoData | null> 视频信息
     */
    async getVideoInfo(bvid: string): Promise<VideoData | null> {
        try {
            // 验证BV号格式
            if (!bvid.startsWith('BV') || bvid.length < 10) {
                loggerError(`[${this.bot.selfId}] 无效的BV号格式: ${bvid}`)
                return null
            }

            // 构建请求参数
            const baseParams = { bvid }
            const signedParams = await this.bot.http.getWbiSignature(baseParams)

            // 调用B站API获取视频信息
            const response = await this.bot.http.http.get<VideoInfoResponse>(
                'https://api.bilibili.com/x/web-interface/view',
                {
                    params: { ...baseParams, ...signedParams },
                    headers: {
                        'Referer': 'https://www.bilibili.com',
                        'Origin': 'https://www.bilibili.com'
                    }
                }
            )

            if (response.code === 0 && response.data) {
                logInfo(`[${this.bot.selfId}] 成功获取视频信息: ${bvid}, 标题: ${response.data.title}`)
                return response.data
            } else {
                loggerError(`[${this.bot.selfId}] 获取视频信息失败: ${bvid}, 错误码: ${response.code}, 消息: ${response.message}`)
                return null
            }
        } catch (error) {
            loggerError(`[${this.bot.selfId}] 解析视频信息时发生错误: ${bvid}`, error)
            return null
        }
    }

    /**
     * 通用解析函数，支持视频/番剧/直播/动态/专栏的链接解析
     * 调用星之阁API获取直链信息
     * @param url 需要解析的B站链接
     * @param accessKey 大会员密钥（可选）
     * @returns Promise<ExternalParseResponse | null> 解析结果
     */
    async parseExternalUrl(url: string, accessKey?: string): Promise<ExternalParseResponse | null> {
        try {
            // 验证URL格式
            if (!url || typeof url !== 'string') {
                loggerError(`[${this.bot.selfId}] 无效的URL: ${url}`)
                return null
            }

            const params: Record<string, string> = { url }
            if (accessKey) {
                params.access_key = accessKey
            }

            const response = await this.bot.http.http.get<ExternalParseResponse>(
                'http://api.xingzhige.com/API/b_parse/', // 使用http
                {
                    params,
                    timeout: 30 * 1000
                }
            )

            if (response.code === 0) {
                logInfo(`[${this.bot.selfId}] 成功使用外部API解析链接: ${url}`)
                return response
            } else {
                loggerError(`[${this.bot.selfId}] 解析链接失败: ${url}, 错误码: ${response.code}, 消息: ${response.message}`)
                return response // 仍然返回响应，让调用者处理
            }
        } catch (error) {
            loggerError(`[${this.bot.selfId}] 解析链接时发生错误: ${url}`, error)
            return null
        }
    }
}