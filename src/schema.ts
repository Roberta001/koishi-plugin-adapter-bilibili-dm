//  src\schema.ts
import { Schema } from 'koishi'

export interface PluginConfig {
  selfId: string
  loggerinfo: boolean
  avatarBase64: boolean
  pollInterval: number
  maxCacheSize: number
  blockedUids: { name: string; uid: string; }[]
  ignoreOfflineMessages: boolean
}

const defaultblockedUids = [
  {
    "uid": "174501086",
    "name": "哔哩哔哩会员购"
  },
  {
    "uid": "12076317",
    "name": "哔哩哔哩智能机"
  },
  {
    "uid": "26366366",
    "name": "哔哩哔哩活动"
  },
  {
    "uid": "458165375",
    "name": "哔哩哔哩课堂"
  },
  {
    "uid": "37090048",
    "name": "哔哩哔哩创作中心"
  },
  {
    "uid": "321173469",
    "name": "哔哩哔哩大会员"
  },
  {
    "uid": "1868902080",
    "name": "哔哩哔哩拜年纪"
  },
  {
    "uid": "611568086",
    "name": "哔哩哔哩福利官"
  },
  {
    "uid": "9617619",
    "name": "哔哩哔哩直播"
  },
  {
    "uid": "235555226",
    "name": "哔哩哔哩UP主服务中心"
  },
  {
    "uid": "17561219",
    "name": "直播小喇叭"
  },
  {
    "uid": "844424930131966",
    "name": "UP主小助手"
  },
  {
    "uid": "492840942",
    "name": "云视听小电视-TV"
  },
  {
    "uid": "625647470",
    "name": "必剪"
  }
]

export const Config: Schema<PluginConfig> =
  Schema.intersect([

    Schema.object({
      selfId: Schema.string().required().description('要登录的账号UID<br>如何查找UID？[点我查看方法](https://github.com/Roberta001/koishi-plugin-adapter-bilibili-dm/blob/main/readme.md#%EF%B8%8F-%E9%85%8D%E7%BD%AE)'),
    }).description('基础设置'),

    Schema.object({
      avatarBase64: Schema.boolean().default(true).description('请求base64头像数据 以解决控制台显示问题'),
      pollInterval: Schema.number().default(3000).description("轮询消息的间隔时间（单位：毫秒）").min(1000).max(60000),
      maxCacheSize: Schema.number().default(1000).description("缓存接收的消息ID，以避免轮询特性导致的消息重复（单位：条）"),
      ignoreOfflineMessages: Schema.boolean().default(true).description('开启后，仅响应机器人上线后的未读消息。<br>否则可能会出现一瞬间响应历史消息的情况哦~'),
    }).description('进阶设置'),

    Schema.object({
      blockedUids: Schema.array(Schema.object({
        name: Schema.string().description('名称（仅用于标记）'),
        uid: Schema.string().description('UID'),
      })).role('table').description('屏蔽的UID用户').default(defaultblockedUids),
    }).description('屏蔽设置'),

    Schema.object({
      loggerinfo: Schema.boolean().default(false).description("日志调试模式").experimental(),
    }).description('调试选项'),

  ])
