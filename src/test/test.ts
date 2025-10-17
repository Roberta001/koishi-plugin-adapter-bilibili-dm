// src\test\test.ts
import { Context } from 'koishi';
// import {  } from 'koishi-plugin-adapter-bilibili-dm'

export function BilibiliTestPlugin(ctx: Context)
{

    // ctx.on('before-send', (session) => {
    //      ctx.logger.info(session)
    // })
    // ctx.on('send', (session) => {
    //      ctx.logger.info(session)
    // })

    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const a = await session.bot.internal.getAllFollowedDynamics()
    //         ctx.logger.info(a)
    //         const b = await session.bot.internal.getDynamicDetail('1044464470807543816')
    //         ctx.logger.info(b)
    //         return

    //     }
    //     return next()
    // })

    // 返回 undefined
    // 可能是太久没更新动态了
    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const a = await session.bot.internal.pollNewDynamics()
    //         ctx.logger.info(a)
    //         return

    //     }
    //     return next()
    // })

    // 成功获取所有关注 UP 主的 20 条动态
    // 感觉这个返回也太多了
    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const a = await session.bot.internal.getAllFollowedDynamics()
    //         ctx.logger.info(a)
    //         return

    //     }
    //     return next()
    // })

    /*
    获取单个动态详情 getDynamicDetail
    */
    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const a = await session.bot.internal.getPersonalDynamics(session.userId)
    //         ctx.logger.info(a[0])
    //         return

    //     }
    //     return next()
    // })

    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const a = await session.bot.internal.getFollowedUsers()
    //         ctx.logger.info(a)
    //         return

    //     }
    //     return next()
    // })

    // ctx.middleware(async (session, next) => {
    //     if (session.platform !== 'bilibili') return next()
    //     if (session.content === 'ping') {
    //         await session.send('pong')
    //         const unfollowUser = await session.bot.internal.unfollowUser(session.userId)
    //         ctx.logger.info(unfollowUser)
    //         const followUser = await session.bot.internal.followUser(session.userId)
    //         ctx.logger.info(followUser)
    //         return
    //     }
    //     return next()
    // })

    // ctx.command(`ccc`)
    //     .action(async ({ session, options }) => {
    //         const i = await session.send("123456")
    //         await session.bot.deleteMessage(session.channelId, i[0])
    //         //   const data = await get()
    //         //   const output = Object.values(data.bots).map((bot) => {
    //         //     return bot
    //         //   })
    //         //   ctx.logger.info(output)
    //         //   // await session.bot.getMessage(session.channelId, session.messageId)
    //         //   // await session.bot.getMessage(session.channelId, i[0])
    //         //   // await session.bot.deleteMessage(session.channelId, i[0])
    //         //   // await session.bot.deleteMessage(session.channelId, i)

    //         //   async function get() {
    //         //     const bots = {}
    //         //     for (const bot of ctx.bots) {
    //         //       bots[bot.sid] = {
    //         //         ...bot.toJSON(),
    //         //         paths: ctx.get('loader')?.paths(bot.ctx.scope),
    //         //         error: bot.error?.message,
    //         //       }
    //         //     }
    //         //     return { bots }
    //         //   }
    //     });

}
