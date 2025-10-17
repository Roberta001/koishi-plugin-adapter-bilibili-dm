/* 

import { Context, Schema } from 'koishi'

// import { } from 'koishi-plugin-adapter-bilibili-dm'

export const name = 'bilibili-dynamic-demo'

export interface Config {
    // // 是否启用视频动态通知
    // enableVideoNotify: boolean
    // // 是否启用图片动态通知  
    // enableImageNotify: boolean
    // // 是否启用文字动态通知
    // enableTextNotify: boolean
    // 过滤的UP主UID列表（只通知这些UP主的动态）
    filterUids: number[]
}

export const Config: Schema<Config> = Schema.object({
    // enableVideoNotify: Schema.boolean().default(true).description('启用视频动态通知'),
    // enableImageNotify: Schema.boolean().default(true).description('启用图片动态通知'),
    // enableTextNotify: Schema.boolean().default(false).description('启用文字动态通知'),
    filterUids: Schema.array(Schema.number()).default([]).description('UP主UID列表（留空则监听所有已经关注的UP主的动态）')
})

export function apply(ctx: Context, config: Config) {
    ctx.logger.info('Bilibili 动态监听 Demo 插件已启动')

    // 监听【通用动态更新事件】
    // 下面所有的事件，都会先触发这个事件。所以注意这里 最好不要与下面重复监听，否则会导致监听到重复data。
    ctx.on('bilibili/dynamic-update', (data) => {
        // 如果配置了过滤UID列表，只处理列表中的UP主
        if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
            return
        } ctx.logger.info(data)
    })

    // 因此 下面的事件监听 不应该与【ctx.on('bilibili/dynamic-update'】一并使用
    // // 监听【视频动态更新事件】
    // if (config.enableVideoNotify) {
    //     ctx.on('bilibili/dynamic-video-update', (data) => {
    //         if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
    //             return
    //         } ctx.logger.info(data)
    //     })
    // }

    // // 监听【图片动态更新事件】
    // if (config.enableImageNotify) {
    //     ctx.on('bilibili/dynamic-image-update', (data) => {
    //         if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
    //             return
    //         }
    //         ctx.logger.info(data)
    //     })
    // }

    // // 监听【文字动态更新事件】
    // if (config.enableTextNotify) {
    //     ctx.on('bilibili/dynamic-text-update', (data) => {
    //         if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
    //             return
    //         }
    //         ctx.logger.info(data)
    //     })
    // }

    // 监听【直播动态更新事件】
    ctx.on('bilibili/dynamic-live-update', (data) => {
        if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
            return
        }
        ctx.logger.info(data)
    })

    // 监听【专栏动态更新事件】
    ctx.on('bilibili/dynamic-article-update', (data) => {
        if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
            return
        }
        ctx.logger.info(data)
    })

    // 监听【转发动态更新事件】
    ctx.on('bilibili/dynamic-forward-update', (data) => {
        if (config.filterUids.length > 0 && !config.filterUids.includes(data.author.uid)) {
            return
        } ctx.logger.info(data)
    })

    // 示例：定时输出统计信息
    const statsInterval = setInterval(() => {
        ctx.logger.info('[统计] Bilibili 动态监听插件运行中...')
    }, 1 * 60 * 1000) // 每1分钟输出一次

    // 插件停用时清理定时器
    ctx.on('dispose', () => {
        clearInterval(statsInterval)
        ctx.logger.info('Bilibili 动态监听 Demo 插件已停用')
    })
}

*/