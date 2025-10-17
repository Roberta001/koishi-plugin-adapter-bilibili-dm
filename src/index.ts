//  src\index.ts
import { getBilibiliErrorMessage } from './bilibiliAPI/temp_error_codes'
import { DataService } from '@koishijs/plugin-console'
import { BilibiliDmAdapter } from './bot/adapter'
import { BilibiliTestPlugin } from './test/test'
import { BilibiliService } from './bot/service'
import { PluginConfig } from './bot/types'
import { BilibiliDmBot } from './bot/bot'
import { Context, Logger, sleep } from 'koishi'
import { Config } from './bot/schema'

import { promises as fs, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export let loggerError: (message: any, ...args: any[]) => void;
export let loggerInfo: (message: any, ...args: any[]) => void;
export let logInfo: (message: any, ...args: any[]) => void;
export let loginfolive: (message: any, ...args: any[]) => void;

let isConsoleEntryAdded = false;

export const name = "adapter-bilibili-dm"
export const inject = {
  required: ["http", "i18n", "server", "logger", "console"],
  optional: ["notifier"]
}
export const reusable = true
export const filter = false
export { Config }

const logger = new Logger(`DEV:${name}`)

export const usage = `
---

<p>Bilibili Direct Message Adapter for Koishi</p>
<p>➣ <a href="https://roberta001.github.io/koishi-plugin-adapter-bilibili-dm/" target="_blank">点我查看使用说明</a></p>

---


需要注意：
- 如果不希望bot响应消息，请配置 nestedblocked 配置项
- B站API有调用频率限制，请合理控制调用频率
- 返回的数据格式可能随B站API更新而变化

---
`

export * from './test/test'
export * from './bot/types'
export * from './bilibiliAPI'

export interface BotStatus {
  status: 'init' | 'qrcode' | 'continue' | 'success' | 'error' | 'offline'
  selfId: string
  image?: string
  message?: string
  pluginName?: string;
}


// 自定义事件
declare module 'koishi' {
  interface Context {
    bilibili_dm_service: BilibiliService
  }

  interface Events {
    'bilibili-dm/status-update': (status: BotStatus) => void
    [key: `bilibili-dm-${string}/status-update`]: (status: BotStatus) => void

    // 动态相关事件
    'bilibili/dynamic-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-video-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-image-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-text-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-article-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-live-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-forward-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-pgc-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-ugc-season-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void
    'bilibili/dynamic-unknown-update': (data: import('./bilibiliAPI/apis/types').DynamicEventData) => void

    // 直播相关事件
    'bilibili/live-update': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-start': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-end': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-info-update': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
  }
}


declare module '@koishijs/plugin-console' {
  namespace Console {
    interface Services {
      [key: `bilibili-dm-${string}`]: BilibiliLauncher
    }
  }
}

declare module '@koishijs/plugin-console' {
  interface Events {
    [key: `bilibili-dm-${string}/start-login`]: (data: { selfId: string }) => void
  }
}

// 创建数据服务
export class BilibiliLauncher extends DataService<Record<string, BotStatus>> {
  private currentBot: string
  private consoleMessages: Record<string, BotStatus> = {}
  readonly serviceId: string

  constructor(ctx: Context, private service: BilibiliService, config: PluginConfig) {
    const serviceId = `bilibili-dm-${config.selfId}`
    super(ctx, serviceId as keyof import('@koishijs/plugin-console').Console.Services)
    this.serviceId = serviceId
    this.currentBot = config.selfId

    logInfo(`BilibiliLauncher构造函数，serviceId: ${serviceId}, currentBot: ${this.currentBot}`)

    const sessionFile = resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm', `${config.selfId}.cookie.json`)
    const hasCacheFile = existsSync(sessionFile)

    logInfo(`BilibiliLauncher初始化，缓存文件存在: ${hasCacheFile}`)

    // 初始化状态
    if (hasCacheFile) {
      this.consoleMessages[config.selfId] = {
        status: 'init',
        selfId: config.selfId,
        message: '正在从缓存加载登录信息...'
      }
      logInfo(`发现缓存文件，初始化状态为"正在从缓存加载登录信息..."`)
    } else {
      this.consoleMessages[config.selfId] = {
        status: 'offline',
        selfId: config.selfId,
        message: '机器人未登录，请点击登录按钮'
      }
      logInfo(`未发现缓存文件，初始化状态为"机器人未登录"`)
    }

    // 立即刷新前端
    this.refresh()

    // 监听特定于selfId的状态更新事件
    const statusEventName = `bilibili-dm-${config.selfId}/status-update`;
    ctx.on(statusEventName as keyof import('koishi').Events, (status: BotStatus) => {
      logInfo(`收到特定实例状态更新通知: ${status.selfId} -> ${status.status}`)

      if (status.selfId === config.selfId) {
        this.consoleMessages[status.selfId] = {
          ...status,
          selfId: config.selfId
        }
        // 刷新前端
        this.refresh()
      } else {
        logInfo(`忽略非本实例的状态更新: ${status.selfId}`)
      }
    })

    ctx.on('bilibili-dm/status-update', (status: BotStatus) => {
      if (status.selfId === config.selfId) {
        logInfo(`收到通用状态更新通知: ${status.selfId} -> ${status.status}`)

        // 更新控制台消息
        this.consoleMessages[status.selfId] = {
          ...status,
          selfId: config.selfId
        }

        // 刷新前端
        this.refresh()
      }
    })

    // 前端发来的登录请求
    const loginEventName = `bilibili-dm-${config.selfId}/start-login`;
    logInfo(`注册登录事件监听器: ${loginEventName}`)

    ctx.console.addListener(loginEventName as any, async (data: { selfId: string }) => {
      const selfId = data.selfId || config.selfId
      this.currentBot = selfId

      logInfo(`当前机器人列表: ${ctx.bots.map(bot => `${bot.platform}:${bot.selfId}`).join(', ')}`)

      // 更新状态
      this.consoleMessages[selfId] = {
        status: 'init',
        selfId: selfId,
        message: '正在初始化...'
      }
      this.refresh()

      // 创建新机器人实例
      logInfo(`创建新机器人实例，使用selfId: ${selfId}`)
      const bot = new BilibiliDmBot(ctx, config)
      const sessionFile = resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm', `${selfId}.cookie.json`)

      // 检查是否存在cookie文件，如果存在则删除
      try {
        if (existsSync(sessionFile)) {
          logInfo(`删除旧的cookie文件: ${sessionFile}`)
          await fs.unlink(sessionFile)
        }
      } catch (error) {
        loggerError(`删除cookie文件失败: `, error)
      }

      // 启动登录流程
      logInfo(`开始启动登录流程...`)
      await this.service.startLogin(bot, sessionFile)
    })
  }

  // 获取控制台消息
  async get() {
    const statusData = this.consoleMessages;

    // 记录当前获取的状态
    logInfo(`前端请求状态数据，当前状态: ${JSON.stringify(statusData[this.currentBot]?.status)}, 消息: ${statusData[this.currentBot]?.message}`)

    // 如果有二维码，记录日志
    Object.values(statusData).forEach(status => {
      if (status.status === 'qrcode' && status.image) {
        logInfo(`返回二维码数据给前端，图片数据长度: ${status.image.length} 字节`)
      }
    });

    Object.keys(statusData).forEach(selfId => {
      if (statusData[selfId]) {
        if (!statusData[selfId].selfId) {
          statusData[selfId].selfId = selfId
        }
        // 确保状态对象包含所有必要的字段
        if (!statusData[selfId].status) {
          logInfo(`状态对象缺少status字段，设置为init`)
          statusData[selfId].status = 'init'
        }
        if (!statusData[selfId].message) {
          statusData[selfId].message = '正在初始化...'
        }
      }
    })

    return statusData;
  }
}

export function apply(ctx: Context, config: PluginConfig) {

  ctx.on('ready', async () => {

    if (process.env.NODE_ENV === 'development' && !__dirname.includes('node_modules')) {
      await sleep(1 * 1000);  // 神秘步骤，可以保佑dev模式
      ctx.plugin(BilibiliTestPlugin)
    }

    // 初始化全局函数
    logInfo = (message: any, ...args: any[]) => {
      if (config.loggerinfo) {
        logger.info(`[${config.selfId}] `, message, ...args);
      }
    };
    loggerInfo = (message: any, ...args: any[]) => {
      ctx.logger.info(`[${config.selfId}] `, message, ...args);
    };
    loggerError = (message: any, ...args: any[]) => {
      // 如果传入的是数字，认为是B站错误码
      if (typeof message === 'number') {
        const errorMessage = getBilibiliErrorMessage(message);
        ctx.logger.error(`[${config.selfId}] `, `B站API错误 [${message}]: ${errorMessage}`, ...args);
      } else {
        ctx.logger.error(`[${config.selfId}] `, message, ...args);
      }
    };
    loginfolive = (message: any, ...args: any[]) => {
      if (config.loggerLiveInfo) {
        logger.info(`[${config.selfId}] `, `[LiveChat] ${message}`, ...args);
      }
    };

    // 创建服务
    const service = new BilibiliService(ctx, config)

    ctx.bilibili_dm_service = service

    if (!isConsoleEntryAdded) {
      isConsoleEntryAdded = true;
      ctx.console.addEntry({
        dev: resolve(__dirname, '../client/index.ts'),
        prod: resolve(__dirname, '../dist'),
      })
    }

    ctx.plugin({
      name: `bilibili-launcher-${config.selfId}`,
      apply: (ctx) => {
        logInfo(`创建BilibiliLauncher实例，selfId: ${config.selfId}`)
        return new BilibiliLauncher(ctx, service, config)
      }
    })

    ctx.plugin(BilibiliDmAdapter, {
      ...config,
      selfId: config.selfId
    })

    ctx.on('dispose', () => {
      isConsoleEntryAdded = false;
      logInfo(`插件正在停用，执行清理操作`)

      try {
        // 标记服务为已停用状态
        service.markAsDisposed()

        // 找到当前插件实例对应的机器人并停止它
        const botToStop = ctx.bots.find(bot => bot.platform === 'bilibili' && bot.selfId === config.selfId);

        if (botToStop) {
          logInfo(`正在停止当前插件实例对应的机器人: ${botToStop.selfId}`);
          try {
            botToStop.stop();
            botToStop.offline(); // 确保机器人状态为离线
            logInfo(`机器人 ${botToStop.selfId} 已停止并设置为离线`);
            botToStop.dispose(); // 彻底移除机器人实例
            logInfo(`机器人 ${botToStop.selfId} 已被彻底移除`);
          } catch (err) {
            ctx.logger.error(`[${config.selfId}] `, `停止机器人 ${botToStop.selfId} 失败: ${err.message}`);
          }
        } else {
          logInfo(`未找到当前插件实例对应的机器人，无需停止。`);
        }

        logInfo(`插件停用完成`);
      } catch (err) {
        ctx.logger.error(`[${config.selfId}] `, `插件停用过程中发生错误: ${err.message}`)
      }
    })

  })


  ctx.logger.info(`[${config.selfId}] `, `Bilibili 私信适配器启动。`)
}
