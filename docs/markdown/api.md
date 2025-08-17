# API 文档

以下所有bot均通过这样获取
```typescript
const bot = Object.values(ctx.bots).find(b => b.selfId === "123456789" || b.user?.id === "123456789");
if (!bot || bot.status !== Universal.Status.ONLINE) {
  ctx.logger.error(`机器人离线或未找到。`);
  return;
}
if (bot == null) return;

// 在这里继续使用 bot.方法
```


## Bot 通用方法

### sendMessage

向指定频道发送消息。

```typescript
sendMessage(channelId: string, content: Fragment): Promise<string[]>
```

**参数:**
- `channelId`: 频道ID，格式为 `private:用户ID`
- `content`: 消息内容，支持文本和图片

**返回值:** `Promise<string[]>` - 发送成功的消息ID列表

**示例:**
```javascript
await bot.sendMessage('private:123456789', 'Hello!')
await bot.sendMessage('private:123456789', h.image('https://example.com/image.jpg'))
```

### sendPrivateMessage

向指定用户发送私信。

```typescript
sendPrivateMessage(userId: string, content: Fragment): Promise<string[]>
```

**参数:**
- `userId`: 用户ID
- `content`: 消息内容

**返回值:** `Promise<string[]>` - 发送成功的消息ID列表

**示例:**
```javascript
await bot.sendPrivateMessage('123456789', 'Hello private!')
```

### getMessage

获取指定频道中的特定消息详情。

```typescript
getMessage(channelId: string, messageId: string): Promise<any | undefined>
```

**参数:**
- `channelId`: 频道ID
- `messageId`: 消息ID

**返回值:** `Promise<any | undefined>` - 消息详情对象或undefined

**示例:**
```javascript
const message = await bot.getMessage('private:123456789', 'msg_key_123')
```

### deleteMessage

撤回指定频道中的特定消息。

```typescript
deleteMessage(channelId: string, messageId: string): Promise<void>
```

**参数:**
- `channelId`: 频道ID
- `messageId`: 消息ID

**返回值:** `Promise<void>`

**示例:**
```javascript
await bot.deleteMessage('private:123456789', 'msg_key_123')
```

# Bot Internal 方法

## 用户关注相关

### followUser

关注指定 UP 主。

```typescript
followUser(uid: string): Promise<boolean>
```

**参数:**
- `uid`: UP主的UID

**返回值:** `Promise<boolean>` - 是否成功关注

**示例:**
```javascript
const success = await bot.internal.followUser('123456789')
```

### unfollowUser

取消关注指定 UP 主。

```typescript
unfollowUser(uid: string): Promise<boolean>
```

**参数:**
- `uid`: UP主的UID

**返回值:** `Promise<boolean>` - 是否成功取消关注

**示例:**
```javascript
const success = await bot.internal.unfollowUser('123456789')
```

### getFollowedUsers

获取关注的用户列表。

```typescript
getFollowedUsers(maxPages?: number): Promise<FollowingUser[]>
```

**参数:**
- `maxPages`: 最大页数，默认10页

**返回值:** `Promise<FollowingUser[]>` - 关注的用户列表

**示例:**
```javascript
const followedUsers = await bot.internal.getFollowedUsers(5)
```

### getUserInfo

获取用户信息。

```typescript
getUserInfo(uid: string): Promise<any>
```

**参数:**
- `uid`: 用户UID

**返回值:** `Promise<any>` - 用户信息对象

**示例:**
```javascript
const userInfo = await bot.internal.getUserInfo('123456789')
```

### isFollowing

检查是否关注了指定用户。

```typescript
isFollowing(uid: string): Promise<boolean>
```

**参数:**
- `uid`: 用户UID

**返回值:** `Promise<boolean>` - 是否已关注

**示例:**
```javascript
const isFollowing = await bot.internal.isFollowing('123456789')
```

### batchCheckFollowing

批量检查关注状态。

```typescript
batchCheckFollowing(uids: string[]): Promise<Record<string, boolean>>
```

**参数:**
- `uids`: 用户UID列表

**返回值:** `Promise<Record<string, boolean>>` - UID到关注状态的映射

**示例:**
```javascript
const followStatus = await bot.internal.batchCheckFollowing(['123', '456', '789'])
```

## 动态相关

### getPersonalDynamics

获取指定 UP 主的动态。

```typescript
getPersonalDynamics(uid: string, offset?: string): Promise<DynamicItem[]>
```

**参数:**
- `uid`: UP主的UID
- `offset`: 分页偏移量

**返回值:** `Promise<DynamicItem[]>` - 动态列表

**示例:**
```javascript
const dynamics = await bot.internal.getPersonalDynamics('123456789')
```

### getDynamicDetail

获取动态详情。

```typescript
getDynamicDetail(dynamicId: string): Promise<DynamicItem | null>
```

**参数:**
- `dynamicId`: 动态ID

**返回值:** `Promise<DynamicItem | null>` - 动态详情或null

**示例:**
```javascript
const detail = await bot.internal.getDynamicDetail('dynamic_id_123')
```

### getAllFollowedDynamics

获取所有关注的 UP 主的动态。

```typescript
getAllFollowedDynamics(offset?: string, updateBaseline?: string): Promise<DynamicItem[]>
```

**参数:**
- `offset`: 分页偏移量
- `updateBaseline`: 更新基线

**返回值:** `Promise<DynamicItem[]>` - 所有关注的UP主的动态列表

**示例:**
```javascript
const allDynamics = await bot.internal.getAllFollowedDynamics()
```

## 搜索相关

### comprehensiveSearch

综合搜索。

```typescript
comprehensiveSearch(keyword: string): Promise<ComprehensiveSearchResponse | null>
```

**参数:**
- `keyword`: 搜索关键词

**返回值:** `Promise<ComprehensiveSearchResponse | null>` - 搜索结果

**示例:**
```javascript
const results = await bot.internal.comprehensiveSearch('关键词')
```

### searchUsers

搜索用户。

```typescript
searchUsers(keyword: string, options?: SearchOptions): Promise<SearchUser[]>
```

**参数:**
- `keyword`: 搜索关键词
- `options`: 搜索选项

**返回值:** `Promise<SearchUser[]>` - 用户搜索结果

**示例:**
```javascript
const users = await bot.internal.searchUsers('用户名')
```

### searchVideos

搜索视频。

```typescript
searchVideos(keyword: string, options?: SearchOptions): Promise<SearchVideo[]>
```

**参数:**
- `keyword`: 搜索关键词
- `options`: 搜索选项

**返回值:** `Promise<SearchVideo[]>` - 视频搜索结果

**示例:**
```javascript
const videos = await bot.internal.searchVideos('视频标题')
```

## 直播相关

### getLiveUsers

获取当前正在直播的UP主列表。

```typescript
getLiveUsers(): Promise<any[]>
```

**返回值:** `Promise<any[]>` - 正在直播的UP主列表

**示例:**
```javascript
const liveUsers = await bot.internal.getLiveUsers()
```

### getUserLiveStatus

获取指定UP主的直播状态。

```typescript
getUserLiveStatus(mid: number): Promise<any>
```

**参数:**
- `mid`: UP主的UID（数字）

**返回值:** `Promise<any>` - 直播状态信息

**示例:**
```javascript
const liveStatus = await bot.internal.getUserLiveStatus(123456789)
```

### isUserLive

检查指定UP主是否正在直播。

```typescript
isUserLive(mid: number): Promise<boolean>
```

**参数:**
- `mid`: UP主的UID（数字）

**返回值:** `Promise<boolean>` - 是否正在直播

**示例:**
```javascript
const isLive = await bot.internal.isUserLive(123456789)
```

# 事件监听

## Koishi 通用事件

### before-send

消息发送前触发的事件。

```typescript
ctx.on('before-send', (session) => {
  console.log('即将发送消息:', session.content)
  // 可以在这里修改消息内容或阻止发送
})
```

**事件数据:** Koishi Session 对象

### send

消息发送后触发的事件。

```typescript
ctx.on('send', (session) => {
  console.log('消息已发送:', session.messageId)
})
```

**事件数据:** Koishi Session 对象，包含已发送的消息ID

### message

接收到消息时触发的事件。

```typescript
ctx.on('message', (session) => {
  console.log('收到消息:', session.content)
})
```

**事件数据:** Koishi Session 对象

### message-deleted

消息被撤回时触发的事件。

```typescript
ctx.on('message-deleted', (session) => {
  console.log('消息被撤回:', session.messageId)
})
```

**事件数据:** Koishi Session 对象

## 插件状态事件

### bilibili-dm/status-update

插件状态更新事件（全局）。

```typescript
ctx.on('bilibili-dm/status-update', (status) => {
  console.log('插件状态更新:', status.status)
})
```

### bilibili-dm-{selfId}/status-update

特定账号的状态更新事件。

```typescript
ctx.on('bilibili-dm-123456789/status-update', (status) => {
  console.log('账号 123456789 状态更新:', status.status)
})
```

**状态数据:**
- `status`: 状态字符串
- `selfId`: 账号ID
- 其他状态相关信息

## 动态相关事件

### bilibili/dynamic-update

通用动态更新事件（下面所有动态更新事件都会与此事件一并触发）。

```typescript
ctx.on('bilibili/dynamic-update', (data) => {
  console.log('动态更新:', data.author.name, data.content.text)
})
```

### bilibili/dynamic-video-update

视频动态更新事件。

```typescript
ctx.on('bilibili/dynamic-video-update', (data) => {
  console.log('视频动态:', data.content.title)
})
```

### bilibili/dynamic-image-update

图片动态更新事件。

```typescript
ctx.on('bilibili/dynamic-image-update', (data) => {
  console.log('图片动态:', data.content.images?.length, '张图片')
})
```

### bilibili/dynamic-text-update

文字动态更新事件。

```typescript
ctx.on('bilibili/dynamic-text-update', (data) => {
  console.log('文字动态:', data.content.text)
})
```

### bilibili/dynamic-article-update

专栏动态更新事件。

```typescript
ctx.on('bilibili/dynamic-article-update', (data) => {
  console.log('专栏动态:', data.content.title)
})
```

### bilibili/dynamic-live-update

直播动态更新事件。

```typescript
ctx.on('bilibili/dynamic-live-update', (data) => {
  console.log('直播动态:', data.content.title)
})
```

### bilibili/dynamic-forward-update

转发动态更新事件。

```typescript
ctx.on('bilibili/dynamic-forward-update', (data) => {
  console.log('转发动态:', data.content.text)
})
```

### bilibili/dynamic-pgc-update

PGC（番剧等）动态更新事件。

```typescript
ctx.on('bilibili/dynamic-pgc-update', (data) => {
  console.log('PGC动态:', data.content.title)
})
```

### bilibili/dynamic-ugc-season-update

UGC合集动态更新事件。

```typescript
ctx.on('bilibili/dynamic-ugc-season-update', (data) => {
  console.log('合集动态:', data.content.title)
})
```

### bilibili/dynamic-unknown-update

未知类型动态更新事件。

```typescript
ctx.on('bilibili/dynamic-unknown-update', (data) => {
  console.log('未知类型动态:', data.type)
})
```

**动态事件数据结构:**
```typescript
interface DynamicEventData {
  id: string                    // 动态ID
  type: string                  // 动态类型
  timestamp: number             // 发布时间戳
  author: {                     // 作者信息
    uid: string                 // 作者UID
    name: string                // 作者昵称
    avatar: string              // 作者头像
    jump_url: string            // 作者主页链接
  }
  content: {                    // 动态内容
    text?: string               // 文字内容
    title?: string              // 标题
    description?: string        // 描述
    images?: string[]           // 图片列表
    bvid?: string              // 视频BV号
    aid?: string               // 视频AV号
    cvid?: number              // 专栏CV号
    jump_url?: string          // 跳转链接
    cover?: string             // 封面图片
  }
  rawData: any                  // 原始数据
}
```

## 直播相关事件

### bilibili/live-update

通用直播状态更新事件。（下面所有直播状态更新事件都会与此事件一并触发）。

```typescript
ctx.on('bilibili/live-update', (data) => {
  console.log('直播状态更新:', data.action)
})
```

### bilibili/live-start

开播事件。

```typescript
ctx.on('bilibili/live-start', (data) => {
  console.log('开播了:', data.author.name, data.content.title)
})
```

### bilibili/live-end

下播事件。

```typescript
ctx.on('bilibili/live-end', (data) => {
  console.log('下播了:', data.author.name)
})
```

### bilibili/live-info-update

直播信息更新事件（标题、封面等变化）。

```typescript
ctx.on('bilibili/live-info-update', (data) => {
  console.log('直播信息更新:', data.content.title)
})
```

**直播事件数据结构:**
```typescript
interface LiveEventData {
  id: string                    // 事件ID
  type: string                  // 事件类型
  action: string                // 动作类型 (start/end/update)
  timestamp: number             // 时间戳
  author: {                     // UP主信息
    uid: string                 // UP主UID
    name: string                // UP主昵称
    avatar: string              // UP主头像
    jump_url: string            // UP主主页链接
  }
  content: {                    // 直播内容
    room_id: string             // 直播间ID
    title: string               // 直播标题
    cover: string               // 直播封面
    jump_url: string            // 直播间链接
    area_name?: string          // 分区名称
    parent_area_name?: string   // 父分区名称
  }
  rawData: any                  // 原始数据
}
```


## 常见错误码

| 错误码 | 说明         | 解决方案              |
| ------ | ------------ | --------------------- |
| -101   | 账号未登录   | 重新扫码登录          |
| -111   | csrf校验失败 | 清除缓存重新登录      |
| -352   | 风控校验失败 | 稍后重试或更换网络    |
| -400   | 请求错误     | 检查参数是否正确      |
| -403   | 权限不足     | 检查账号权限          |
| -500   | 服务器错误   | B站服务异常，稍后重试 |
| 21020  | 发送频率过快 | 降低发送频率          |
| 10005  | 消息ID不存在 | 检查消息ID是否正确    |


## 注意事项

1. **频率限制**: B站API有调用频率限制，请合理控制调用频率
2. **登录状态**: 大部分API需要有效的登录状态
3. **权限检查**: 某些操作需要特定权限
4. **数据格式**: 返回的数据格式可能随B站API更新而变化
5. **错误处理**: 建议对所有API调用进行错误处理
6. **内存管理**: 长时间运行时注意清理缓存和监听器
7. **网络异常**: 处理网络超时和连接失败的情况
8. **事件重复**: 避免重复监听相同事件导致重复处理
