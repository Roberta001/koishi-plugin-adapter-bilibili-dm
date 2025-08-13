//  src\index.ts
import { DataService } from '@koishijs/plugin-console'
import { Config, PluginConfig } from './bot/schema'
import { BilibiliDmAdapter } from './bot/adapter'
import { BilibiliService } from './bot/service'
import { BilibiliDmBot } from './bot/bot'
import { BilibiliTestPlugin } from './test/test';
import { Context, Logger } from 'koishi'

import { promises as fs, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export let loggerError: (message: any, ...args: any[]) => void;
export let loggerInfo: (message: any, ...args: any[]) => void;
export let logInfo: (message: any, ...args: any[]) => void;

let isConsoleEntryAdded = false;

export const name = "adapter-bilibili-dm"
export const inject = {
  required: ["http", "i18n", "server", "logger", "console"],
  optional: ["notifier"]
}
export const reusable = true
export const filter = false
export { Config }
const logger = new Logger(`Development:${name}-dev`)
export * from './test/test'
export const usage = `
---

<p>Bilibili Direct Message Adapter for Koishi</p>
<p>➣ <a href="https://github.com/Roberta001/koishi-plugin-adapter-bilibili-dm/tree/main?tab=readme-ov-file#koishi-plugin-adapter-bilibili-dm" target="_blank">点我查看使用说明</a></p>

---
`
export interface BotStatus {
  status: 'init' | 'qrcode' | 'continue' | 'success' | 'error' | 'offline'
  selfId: string
  image?: string
  message?: string
  pluginName?: string;
}

export type { BotLoginStatus } from './bot/service'

// 自定义事件
declare module 'koishi' {
  interface Context {
    bilibili_dm_service: BilibiliService
  }

  interface Events {
    'bilibili-dm/status-update': (status: BotStatus) => void
    [key: `bilibili-dm-${string}/status-update`]: (status: BotStatus) => void

    // 动态相关事件
    'bilibili/dynamic-update': (data: DynamicEventData) => void
    'bilibili/dynamic-video-update': (data: DynamicEventData) => void
    'bilibili/dynamic-image-update': (data: DynamicEventData) => void
    'bilibili/dynamic-text-update': (data: DynamicEventData) => void
    'bilibili/dynamic-article-update': (data: DynamicEventData) => void
    'bilibili/dynamic-live-update': (data: DynamicEventData) => void
    'bilibili/dynamic-forward-update': (data: DynamicEventData) => void
    'bilibili/dynamic-pgc-update': (data: DynamicEventData) => void
    'bilibili/dynamic-ugc-season-update': (data: DynamicEventData) => void
    'bilibili/dynamic-unknown-update': (data: DynamicEventData) => void

    // 直播相关事件
    'bilibili/live-update': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-start': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-end': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
    'bilibili/live-info-update': (data: import('./bilibiliAPI/apis/types').LiveEventData) => void
  }
}

// 动态事件数据类型
export interface DynamicEventData {
  dynamicId: string
  type: string
  author: {
    uid: number
    name: string
    face: string
    action: string
    timestamp: number
  }
  content: {
    text: string
    type: string
    video?: {
      aid: string
      bvid: string
      title: string
      desc: string
      cover: string
      url: string
    }
    images?: string[]
    article?: {
      id: number
      title: string
      desc: string
      covers: string[]
      url: string
    }
    live?: {
      id: number
      title: string
      cover: string
      url: string
      isLive: boolean
    }
  }
  rawData: any
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

    logInfo(`[${config.selfId}] BilibiliLauncher构造函数，serviceId: ${serviceId}, currentBot: ${this.currentBot}`)

    const sessionFile = resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm', `${config.selfId}.cookie.json`)
    const hasCacheFile = existsSync(sessionFile)

    logInfo(`[${config.selfId}] BilibiliLauncher初始化，缓存文件存在: ${hasCacheFile}`)

    // 初始化状态
    if (hasCacheFile) {
      this.consoleMessages[config.selfId] = {
        status: 'init',
        selfId: config.selfId,
        message: '正在从缓存加载登录信息...'
      }
      logInfo(`[${config.selfId}] 发现缓存文件，初始化状态为"正在从缓存加载登录信息..."`)
    } else {
      this.consoleMessages[config.selfId] = {
        status: 'offline',
        selfId: config.selfId,
        message: '机器人未登录，请点击登录按钮'
      }
      logInfo(`[${config.selfId}] 未发现缓存文件，初始化状态为"机器人未登录"`)
    }

    // 立即刷新前端
    this.refresh()

    // 监听特定于selfId的状态更新事件
    const statusEventName = `bilibili-dm-${config.selfId}/status-update`;
    ctx.on(statusEventName as keyof import('koishi').Events, (status: BotStatus) => {
      logInfo(`[${config.selfId}] 收到特定实例状态更新通知: ${status.selfId} -> ${status.status}`)

      if (status.selfId === config.selfId) {
        this.consoleMessages[status.selfId] = {
          ...status,
          selfId: config.selfId
        }
        // 刷新前端
        this.refresh()
      } else {
        logInfo(`[${config.selfId}] 忽略非本实例的状态更新: ${status.selfId}`)
      }
    })

    ctx.on('bilibili-dm/status-update', (status: BotStatus) => {
      if (status.selfId === config.selfId) {
        logInfo(`[${config.selfId}] 收到通用状态更新通知: ${status.selfId} -> ${status.status}`)

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
    logInfo(`[${config.selfId}] 注册登录事件监听器: ${loginEventName}`)

    ctx.console.addListener(loginEventName as any, async (data: { selfId: string }) => {
      const selfId = data.selfId || config.selfId
      this.currentBot = selfId

      logInfo(`[${selfId}] 当前机器人列表: ${ctx.bots.map(bot => `${bot.platform}:${bot.selfId}`).join(', ')}`)

      // 更新状态
      this.consoleMessages[selfId] = {
        status: 'init',
        selfId: selfId,
        message: '正在初始化...'
      }
      this.refresh()

      // 创建新机器人实例
      logInfo(`[${selfId}] 创建新机器人实例，使用selfId: ${selfId}`)
      const bot = new BilibiliDmBot(ctx, config)
      const sessionFile = resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm', `${selfId}.cookie.json`)

      // 检查是否存在cookie文件，如果存在则删除
      try {
        if (existsSync(sessionFile)) {
          logInfo(`[${selfId}] 删除旧的cookie文件: ${sessionFile}`)
          await fs.unlink(sessionFile)
        }
      } catch (error) {
        loggerError(`[${selfId}] 删除cookie文件失败: `, error)
      }

      // 启动登录流程
      logInfo(`[${selfId}] 开始启动登录流程...`)
      await this.service.startLogin(bot, sessionFile)
    })
  }

  // 获取控制台消息
  async get() {
    const statusData = this.consoleMessages;

    // 记录当前获取的状态
    logInfo(`[${this.currentBot}] 前端请求状态数据，当前状态: ${JSON.stringify(statusData[this.currentBot]?.status)}, 消息: ${statusData[this.currentBot]?.message}`)

    // 如果有二维码，记录日志
    Object.values(statusData).forEach(status => {
      if (status.status === 'qrcode' && status.image) {
        logInfo(`[${status.selfId}] 返回二维码数据给前端，图片数据长度: ${status.image.length} 字节`)
      }
    });

    Object.keys(statusData).forEach(selfId => {
      if (statusData[selfId]) {
        if (!statusData[selfId].selfId) {
          statusData[selfId].selfId = selfId
        }
        // 确保状态对象包含所有必要的字段
        if (!statusData[selfId].status) {
          logInfo(`[${selfId}] 状态对象缺少status字段，设置为init`)
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

  // 开发模式且非依赖安装时 加载测试插件
  if (process.env.NODE_ENV === 'development' && !__dirname.includes('node_modules')) {
    ctx.plugin(BilibiliTestPlugin)
  }

  ctx.on('ready', () => {

    // 初始化全局函数
    logInfo = (message: any, ...args: any[]) => {
      if (config.loggerinfo) {
        logger.info(message, ...args);
      }
    };
    loggerInfo = (message: any, ...args: any[]) => {
      ctx.logger.info(message, ...args);
    };
    loggerError = (message: any, ...args: any[]) => {
      ctx.logger.error(message, ...args);
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
        logInfo(`[${config.selfId}] 创建BilibiliLauncher实例，selfId: ${config.selfId}`)
        return new BilibiliLauncher(ctx, service, config)
      }
    })

    ctx.plugin(BilibiliDmAdapter, {
      ...config,
      selfId: config.selfId
    })

    ctx.on('dispose', () => {
      isConsoleEntryAdded = false;
      logInfo(`[${config.selfId}] 插件正在停用，执行清理操作`)

      try {
        // 标记服务为已停用状态
        service.markAsDisposed()

        // 找到当前插件实例对应的机器人并停止它
        const botToStop = ctx.bots.find(bot => bot.platform === 'bilibili' && bot.selfId === config.selfId);

        if (botToStop) {
          logInfo(`[${config.selfId}] 正在停止当前插件实例对应的机器人: ${botToStop.selfId}`);
          try {
            botToStop.stop();
            botToStop.offline(); // 确保机器人状态为离线
            logInfo(`[${config.selfId}] 机器人 ${botToStop.selfId} 已停止并设置为离线`);
            botToStop.dispose(); // 彻底移除机器人实例
            logInfo(`[${config.selfId}] 机器人 ${botToStop.selfId} 已被彻底移除`);
          } catch (err) {
            ctx.logger.error(`[${config.selfId}] 停止机器人 ${botToStop.selfId} 失败: ${err.message}`);
          }
        } else {
          logInfo(`[${config.selfId}] 未找到当前插件实例对应的机器人，无需停止。`);
        }

        logInfo(`[${config.selfId}] 插件停用完成`);
      } catch (err) {
        ctx.logger.error(`[${config.selfId}] 插件停用过程中发生错误: ${err.message}`)
      }
    })

  })


  ctx.logger.info(`[${config.selfId}] Bilibili 私信适配器启动。`)
}
