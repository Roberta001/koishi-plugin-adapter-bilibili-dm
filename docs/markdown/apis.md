# API 文档

本页面详细介绍了 Bilibili Direct Message 适配器提供的所有 API 方法。

## Bot 实例获取

所有 API 调用都需要先获取 bot 实例：

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
```typescript
await bot.sendMessage('private:123456789', 'Hello!')
await bot.sendMessage('private:123456789', h.image('https://example.com/image.jpg'))
```

**注意事项:**
- 消息内容支持 Koishi 的 Element 格式
- 图片需要提供有效的 URL 地址
- 发送失败时会抛出异常

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
```typescript
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
```typescript
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
```typescript
await bot.deleteMessage('private:123456789', 'msg_key_123')
```

**注意事项:**
- 只能撤回自己发送的消息
- 消息撤回有时间限制

## Bot Internal 方法

以下所有方法均需要使用 `bot.internal.` 访问。

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
```typescript
const success = await bot.internal.followUser('123456789')
if (success) {
  console.log('关注成功')
} else {
  console.log('关注失败')
}
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
```typescript
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
```typescript
const followedUsers = await bot.internal.getFollowedUsers(5)
console.log(`关注了 ${followedUsers.length} 个用户`)
```

**数据结构:**
```typescript
interface FollowingUser {
  mid: number           // 用户ID
  uname: string         // 用户名
  face: string          // 头像URL
  sign: string          // 个性签名
  official_verify: {    // 认证信息
    type: number
    desc: string
  }
}
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
```typescript
const userInfo = await bot.internal.getUserInfo('123456789')
console.log(`用户名: ${userInfo.name}`)
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
```typescript
const isFollowing = await bot.internal.isFollowing('123456789')
if (isFollowing) {
  console.log('已关注该用户')
}
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
```typescript
const followStatus = await bot.internal.batchCheckFollowing(['123', '456', '789'])
Object.entries(followStatus).forEach(([uid, isFollowing]) => {
  console.log(`用户 ${uid}: ${isFollowing ? '已关注' : '未关注'}`)
})
```

## 动态相关

### getPersonalDynamics

获取指定 UP 主的动态。

```typescript
getPersonalDynamics(uid: string, offset?: string): Promise<DynamicItem[]>
```

**参数:**
- `uid`: UP主的UID
- `offset`: 分页偏移量，用于获取更多动态

**返回值:** `Promise<DynamicItem[]>` - 动态列表

**示例:**
```typescript
const dynamics = await bot.internal.getPersonalDynamics('123456789')
console.log(`获取到 ${dynamics.length} 条动态`)
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
```typescript
const detail = await bot.internal.getDynamicDetail('dynamic_id_123')
if (detail) {
  console.log(`动态内容: ${detail.desc.text}`)
}
```

### getAllFollowedDynamics

获取所有关注的 UP 主的动态。

```typescript
getAllFollowedDynamics(offset?: string, updateBaseline?: string): Promise<DynamicItem[]>
```

**参数:**
- `offset`: 分页偏移量
- `updateBaseline`: 更新基线，用于增量获取

**返回值:** `Promise<DynamicItem[]>` - 所有关注的UP主的动态列表

**示例:**
```typescript
const allDynamics = await bot.internal.getAllFollowedDynamics()
console.log(`获取到 ${allDynamics.length} 条动态`)
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
```typescript
const results = await bot.internal.comprehensiveSearch('关键词')
if (results) {
  console.log(`搜索到 ${results.result.length} 个结果`)
}
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
```typescript
const users = await bot.internal.searchUsers('用户名', { page: 1, pageSize: 20 })
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
```typescript
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
```typescript
const liveUsers = await bot.internal.getLiveUsers()
console.log(`当前有 ${liveUsers.length} 个UP主在直播`)
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
```typescript
const liveStatus = await bot.internal.getUserLiveStatus(123456789)
if (liveStatus.live_status === 1) {
  console.log('UP主正在直播')
}
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
```typescript
const isLive = await bot.internal.isUserLive(123456789)
if (isLive) {
  console.log('UP主正在直播')
}
```

### joinLiveRoom

控制bot进入指定直播间。

```typescript
joinLiveRoom(roomId: string): Promise<boolean>
```

**参数:**
- `roomId`: 直播间ID

**返回值:** `Promise<boolean>` - 是否成功进入直播间

**示例:**
```typescript
const success = await bot.internal.joinLiveRoom('12345')
if (success) {
  console.log('成功进入直播间')
}
```

**注意事项:**
- 同时只能进入一个直播间
- 进入新直播间会自动退出当前直播间
- 进入直播间后会开始接收弹幕消息

### leaveLiveRoom

控制bot退出当前直播间。

```typescript
leaveLiveRoom(): Promise<boolean>
```

**返回值:** `Promise<boolean>` - 是否成功退出直播间

**示例:**
```typescript
const success = await bot.internal.leaveLiveRoom()
if (success) {
  console.log('成功退出直播间')
}
```

