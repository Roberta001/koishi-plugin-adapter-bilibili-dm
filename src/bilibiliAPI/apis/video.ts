// src\bilibiliAPI\apis\video.ts
import { BilibiliDmBot } from '../../bot/bot'
import { logInfo, loggerError } from '../../index'
import {
    VideoData,
    VideoInfoResponse,
    BilibiliError
} from './types'

export class VideoAPI {
    private bot: BilibiliDmBot

    constructor(bot: BilibiliDmBot) {
        this.bot = bot
    }

    /**
     * 解析视频信息，获取视频aid、cid等详细信息
     * @param bvid 视频BV号
     * @returns Promise<VideoData | null> 视频详细信息
     */
    async parseVideo(bvid: string): Promise<VideoData | null> {
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
}