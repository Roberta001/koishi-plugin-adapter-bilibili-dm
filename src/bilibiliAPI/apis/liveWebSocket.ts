// src\bilibiliAPI\apis\liveWebSocket.ts
import WebSocket from 'ws'
import { BilibiliDmBot } from '../../bot/bot'
import { logInfo, loggerError, loginfolive } from '../../index'
import {
  DanmakuServerInfo,
  WSPacketHeader,
  WSOperation,
  LiveDanmakuMessage,
  DanmuMsgData,
  SendGiftData,
  WelcomeData,
  LiveChatEventData
} from './types'

import * as zlib from 'node:zlib'

export class LiveWebSocketManager {
  private ws: WebSocket | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private currentRoomId: number | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private liveRoomAPI: any
  private disposed = false
  private autoReconnect = false

  constructor(private bot: BilibiliDmBot, private onMessage: (data: LiveChatEventData) => void) {
    // 延迟初始化 liveRoomAPI，避免循环依赖
    this.liveRoomAPI = null
    this.disposed = false
  }

  // 标记为已销毁
  dispose(): void {
    this.disposed = true
    this.autoReconnect = false // 禁用自动重连

    // 如果当前在直播间中，尝试退出
    if (this.currentRoomId) {
      // 记录当前房间ID，但不保存状态
      const roomId = this.currentRoomId
      this.currentRoomId = null // 立即清除房间ID，防止重连

      // 尝试退出房间
      this.leaveRoom().catch(err => loggerError('[LiveWebSocket] 销毁时退出房间失败:', err))
    }

    // 确保断开连接
    this.disconnect()
  }

  // 设置 LiveRoomAPI 实例
  setLiveRoomAPI(liveRoomAPI: any): void {
    this.liveRoomAPI = liveRoomAPI
  }

  // 进入直播间
  async enterRoom(roomId: number): Promise<void> {
    // 如果已经被销毁，不允许进入直播间
    if (this.disposed) {
      throw new Error('LiveWebSocketManager已被销毁，无法进入直播间')
    }

    // 如果已经在其他直播间，先退出
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      await this.leaveRoom()
    }

    this.currentRoomId = roomId
    this.autoReconnect = true // 设置为允许自动重连

    try {
      // 如果没有设置 liveRoomAPI，创建一个临时实例
      if (!this.liveRoomAPI) {
        const { LiveRoomAPI } = await import('./liveRoom')
        this.liveRoomAPI = new LiveRoomAPI(this.bot)
      }

      // 获取直播间信息
      const roomInfo = await this.liveRoomAPI.getRoomInfo(roomId)

      // 进入直播间
      await this.liveRoomAPI.enterRoom(roomId)

      // 获取弹幕服务器配置
      const danmakuInfo = await this.liveRoomAPI.getDanmakuInfo(roomId)

      // 验证弹幕服务器配置
      if (!danmakuInfo) {
        throw new Error('获取弹幕服务器配置失败: danmakuInfo为空')
      }

      if (!danmakuInfo.host_list || !Array.isArray(danmakuInfo.host_list) || danmakuInfo.host_list.length === 0) {
        throw new Error('获取弹幕服务器配置失败: host_list为空或无效')
      }

      if (!danmakuInfo.token) {
        throw new Error('获取弹幕服务器配置失败: token为空')
      }

      loginfolive(`弹幕服务器配置:`, {
        host_count: danmakuInfo.host_list.length,
        token_length: danmakuInfo.token.length
      })

      // 连接WebSocket
      await this.connectWebSocket(danmakuInfo, roomInfo)

      logInfo(`[LiveWebSocket] 成功进入直播间 ${roomId}`)
    } catch (error) {
      // 连接失败时重置状态
      this.autoReconnect = false
      this.currentRoomId = null
      loggerError(`[LiveWebSocket] 进入直播间失败:`, error)
      throw error
    }
  }

  // 退出直播间
  async leaveRoom(): Promise<void> {
    if (!this.currentRoomId) return

    logInfo(`[LiveWebSocket] 退出直播间 ${this.currentRoomId}`)

    // 先设置为null，阻止重连
    const roomId = this.currentRoomId
    this.currentRoomId = null
    this.autoReconnect = false // 禁用自动重连
    // 然后断开连接
    this.disconnect()

    return Promise.resolve()
  }

  // 连接WebSocket
  private async connectWebSocket(danmakuInfo: DanmakuServerInfo, roomInfo: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经被销毁，不允许连接
        if (this.disposed) {
          reject(new Error('LiveWebSocketManager已被销毁，无法连接WebSocket'))
          return
        }

        // 选择第一个可用的服务器
        const server = danmakuInfo.host_list[0]
        const wsUrl = `wss://${server.host}:${server.wss_port}/sub`

        loginfolive(`连接到: ${wsUrl}`)

        this.ws = new WebSocket(wsUrl)

        this.ws.on('open', () => {
          loginfolive(`WebSocket连接已建立`)
          this.sendAuthPacket(danmakuInfo, roomInfo)
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve()
        })

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data, roomInfo)
        })

        this.ws.on('close', (code, reason) => {
          loginfolive(`连接关闭: ${code} ${reason}`)
          this.isConnected = false
          this.stopHeartbeat()

          // 如果已经被销毁，不进行重连
          if (this.disposed) {
            loginfolive(`实例已销毁，不进行重连`)
            return
          }

          // 只有在仍然有 currentRoomId 且允许自动重连时才重连
          if (this.currentRoomId && this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            loginfolive(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
            setTimeout(() => {
              // 再次检查是否仍需要重连
              if (this.currentRoomId && this.autoReconnect && !this.disposed) {
                this.connectWebSocket(danmakuInfo, roomInfo).catch(error => {
                  loggerError(`[LiveWebSocket] 重连失败:`, error)
                })
              } else if (this.disposed) {
                loginfolive(`实例已销毁，取消重连`)
              } else if (!this.autoReconnect) {
                loginfolive(`自动重连已禁用，取消重连`)
              } else {
                loginfolive(`已退出直播间，取消重连`)
              }
            }, this.reconnectDelay)
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            loggerError(`[LiveWebSocket] 达到最大重连次数，停止重连`)
          } else if (!this.currentRoomId) {
            loginfolive(`主动退出直播间，不进行重连`)
          } else if (!this.autoReconnect) {
            loginfolive(`自动重连已禁用，不进行重连`)
          }
        })

        this.ws.on('error', (error) => {
          loggerError(`[LiveWebSocket] WebSocket错误:`, error)
          reject(error)
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  // 发送认证包
  private sendAuthPacket(danmakuInfo: DanmakuServerInfo, roomInfo: any): void {
    // 获取当前登录用户的 UID
    const uid = parseInt(this.bot.selfId) || 0

    // 生成随机的buvid和queue_uuid
    const buvid = this.generateBuvid()
    const queueUuid = this.generateQueueUuid()

    const authData = {
      uid: uid,
      roomid: this.currentRoomId,
      protover: 3,
      buvid: buvid,
      support_ack: true,
      queue_uuid: queueUuid,
      scene: 'room',
      platform: 'web',
      type: 2,
      key: danmakuInfo.token
    }

    const authJson = JSON.stringify(authData)
    const authBuffer = Buffer.from(authJson, 'utf8')

    // 认证包使用协议版本1
    const packet = this.createPacket(WSOperation.HANDSHAKE, authBuffer, 1)
    this.ws?.send(packet)

    loginfolive(`发送认证包 (uid: ${uid}, roomid: ${this.currentRoomId})`)
  }

  // 生成BUVID
  private generateBuvid(): string {
    const chars = '0123456789ABCDEF'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * 16)]
    }
    result += '-'
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * 16)]
    }
    result += '-'
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * 16)]
    }
    result += '-'
    for (let i = 0; i < 4; i++) {
      result += chars[Math.floor(Math.random() * 16)]
    }
    result += '-'
    for (let i = 0; i < 12; i++) {
      result += chars[Math.floor(Math.random() * 16)]
    }
    result += Math.floor(Math.random() * 100000) + 'infoc'
    return result
  }

  // 生成队列UUID
  private generateQueueUuid(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 9; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  // 创建数据包
  private createPacket(operation: WSOperation, body: Buffer, protocolVersion: number = 1): Buffer {
    const headerLength = 16
    const packetLength = headerLength + body.length

    const header = Buffer.alloc(headerLength)
    header.writeUInt32BE(packetLength, 0)      // 包长度
    header.writeUInt16BE(headerLength, 4)      // 头部长度
    header.writeUInt16BE(protocolVersion, 6)   // 协议版本
    header.writeUInt32BE(operation, 8)         // 操作码
    header.writeUInt32BE(1, 12)                // 序列号

    return Buffer.concat([header, body])
  }

  // 解析数据包头部
  private parseHeader(buffer: Buffer): WSPacketHeader {
    return {
      packetLength: buffer.readUInt32BE(0),
      headerLength: buffer.readUInt16BE(4),
      protocolVersion: buffer.readUInt16BE(6),
      operation: buffer.readUInt32BE(8),
      sequenceId: buffer.readUInt32BE(12)
    }
  }

  // 处理消息
  private handleMessage(data: Buffer, roomInfo: any): void {
    // 如果已经被销毁，不处理消息
    if (this.disposed) {
      return
    }

    let offset = 0

    while (offset < data.length) {
      if (offset + 16 > data.length) {
        loggerError(`[LiveWebSocket] 数据包头部不完整，剩余长度: ${data.length - offset}`)
        break
      }

      const header = this.parseHeader(data.slice(offset))

      if (header.packetLength < 16 || offset + header.packetLength > data.length) {
        loggerError(`[LiveWebSocket] 数据包长度异常: ${header.packetLength}, 剩余数据: ${data.length - offset}`)
        break
      }

      const bodyBuffer = data.slice(offset + header.headerLength, offset + header.packetLength)
      this.processPacket(header, bodyBuffer, roomInfo)
      offset += header.packetLength
    }
  }


  // 处理单个数据包
  private processPacket(header: WSPacketHeader, body: Buffer, roomInfo: any): void {
    loginfolive(`收到数据包 - 操作码: ${header.operation}, 协议版本: ${header.protocolVersion}, 包长度: ${header.packetLength}, 数据长度: ${body.length}`)

    // 如果已经被销毁，不处理数据包
    if (this.disposed) {
      return
    }

    switch (header.operation) {
      case WSOperation.HANDSHAKE_REPLY:
        loginfolive(`认证成功`)
        this.startHeartbeat()
        break

      case WSOperation.HEARTBEAT_REPLY:
        // 心跳回复，包含在线人数
        if (body.length >= 4) {
          const online = body.readUInt32BE(0)
          loginfolive(`在线人数: ${online}`)
        }
        break

      case WSOperation.SEND_MSG:
        loginfolive(`收到服务器消息数据包，开始处理`)
        this.handleLiveMessage(header, body, roomInfo)
        break

      case WSOperation.SEND_MSG_REPLY:
        loginfolive(`收到消息回复数据包，开始处理`)
        this.handleLiveMessage(header, body, roomInfo)
        break

      default:
        loginfolive(`未知操作码: ${header.operation}`)
        break
    }
  }

  // 处理直播消息
  private handleLiveMessage(header: WSPacketHeader, body: Buffer, roomInfo: any): void {
    // 如果已经被销毁，不处理消息
    if (this.disposed) {
      return
    }

    try {
      let decompressedData: Buffer

      // 根据协议版本解压数据
      switch (header.protocolVersion) {
        case 0:
        case 1:
          decompressedData = body
          loginfolive(`未压缩数据，长度: ${body.length}`)
          break
        case 2:
          // zlib压缩
          try {
            decompressedData = zlib.inflateSync(body)
            loginfolive(`zlib解压成功，原始长度: ${body.length}, 解压后长度: ${decompressedData.length}`)
          } catch (error) {
            loggerError(`[LiveWebSocket] zlib解压失败:`, error)
            return
          }
          break
        case 3:
          // brotli压缩 (Node.js 11.7.0+)
          try {
            decompressedData = zlib.brotliDecompressSync(body)
            loginfolive(`brotli解压成功，原始长度: ${body.length}, 解压后长度: ${decompressedData.length}`)
          } catch (error) {
            loggerError(`[LiveWebSocket] brotli解压失败:`, error)
            return
          }
          break
        default:
          loggerError(`[LiveWebSocket] 不支持的协议版本: ${header.protocolVersion}`)
          return
      }

      // 如果是压缩数据，解压后可能包含多个数据包，需要重新解析
      if (header.protocolVersion >= 2) {
        loginfolive(`处理压缩数据，重新解析包`)
        this.handleMessage(decompressedData, roomInfo)
      } else {
        // 协议版本0或1，直接处理单个消息
        this.parseRawMessage(decompressedData, roomInfo)
      }

    } catch (error) {
      loggerError(`[LiveWebSocket] 处理直播消息失败:`, error)
    }
  }

  // 解析原始消息数据
  private parseRawMessage(data: Buffer, roomInfo: any): void {
    // 如果已经被销毁，不处理消息
    if (this.disposed) {
      return
    }

    try {
      const msgStr = data.toString('utf8')
      if (!msgStr.trim()) {
        loginfolive(`收到空消息，跳过`)
        return
      }

      loginfolive(`收到原始消息: ${msgStr.substring(0, 100)}${msgStr.length > 100 ? '...' : ''}`)

      const message: LiveDanmakuMessage = JSON.parse(msgStr)
      this.processLiveMessage(message, roomInfo)
    } catch (error) {
      loggerError(`[LiveWebSocket] 解析原始消息失败:`, error)
      loggerError(`[LiveWebSocket] 原始数据长度: ${data.length}`)
      loggerError(`[LiveWebSocket] 原始数据内容: ${data.toString('utf8').substring(0, 200)}...`)
    }
  }

  // 处理具体的直播消息
  private processLiveMessage(message: LiveDanmakuMessage, roomInfo: any): void {
    // 如果已经被销毁，不处理消息
    if (this.disposed || !this.currentRoomId) {
      return
    }

    if (!message || !message.cmd) {
      return
    }

    // 只处理弹幕消息，其他所有消息完全忽略
    if (message.cmd === 'DANMU_MSG') {
      if (message.info && Array.isArray(message.info)) {
        const eventData: LiveChatEventData = {
          roomId: this.currentRoomId,
          roomInfo: {
            title: roomInfo?.title || '',
            uname: roomInfo?.anchor_info?.base_info?.uname || '',
            face: roomInfo?.anchor_info?.base_info?.face || '',
            area_name: roomInfo?.area_name || '',
            online: roomInfo?.online || 0
          },
          message: {
            type: 'danmaku',
            data: this.parseDanmuMsg(message.info),
            timestamp: Date.now(),
            raw: message
          }
        }

        loginfolive(`收到弹幕: ${eventData.message.data.text} - 用户: ${eventData.message.data.uname}`)

        // 发送事件
        try {
          this.onMessage(eventData)
        } catch (error) {
          loggerError(`[LiveWebSocket] 发送事件失败:`, error)
        }
      }
    }
    // 其他所有消息类型完全忽略，不处理也不输出日志
  }

  // 解析弹幕消息
  private parseDanmuMsg(info: any[]): DanmuMsgData {
    return {
      text: info[1] || '',
      uid: info[2]?.[0] || 0,
      uname: info[2]?.[1] || '',
      timestamp: info[0]?.[4] || Date.now(),
      color: info[0]?.[3] || 16777215,
      fontSize: info[0]?.[2] || 25,
      mode: info[0]?.[1] || 1,
      medal: info[3]?.length > 0 ? {
        name: info[3][1] || '',
        level: info[3][0] || 0,
        color: info[3][4] || 0,
        anchor_uname: info[3][2] || '',
        anchor_roomid: info[3][3] || 0
      } : undefined,
      user_level: info[4]?.[0] || 0,
      is_vip: info[2]?.[3] === 1,
      is_svip: info[2]?.[4] === 1,
      is_admin: info[2]?.[2] === 1,
      title: info[5]?.[0] || undefined
    }
  }

  // 解析礼物消息
  private parseSendGift(data: any): SendGiftData {
    return {
      giftName: data.giftName || '',
      num: data.num || 0,
      uname: data.uname || '',
      face: data.face || '',
      guard_level: data.guard_level || 0,
      uid: data.uid || 0,
      timestamp: data.timestamp || Date.now(),
      giftId: data.giftId || 0,
      price: data.price || 0,
      rnd: data.rnd || '',
      coin_type: data.coin_type || '',
      total_coin: data.total_coin || 0
    }
  }

  // 解析欢迎消息
  private parseWelcome(data: any): WelcomeData {
    return {
      uid: data.uid || 0,
      uname: data.uname || '',
      is_admin: data.is_admin || false,
      vip: data.vip || 0,
      svip: data.svip || 0
    }
  }

  // 解析互动消息
  private parseInteractWord(data: any): any {
    try {
      // 基本的互动信息解析
      const result: any = {
        action: '进入直播间',
        uname: '未知用户',
        uid: 0,
        timestamp: Date.now(),
        raw: data
      }

      // 尝试从 dmscore 判断互动类型
      if (data.dmscore) {
        if (data.dmscore >= 10) {
          result.action = '关注了主播'
        } else if (data.dmscore >= 5) {
          result.action = '点赞了直播间'
        } else {
          result.action = '进入了直播间'
        }
      }

      // 如果有 pb 字段，这是 protobuf 编码的数据
      // 由于完整解析 protobuf 比较复杂，我们提供基本信息
      if (data.pb) {
        // 尝试从 base64 解码获取一些基本信息
        try {
          const pbBuffer = Buffer.from(data.pb, 'base64')
          // 这里可以添加更复杂的 protobuf 解析逻辑
          // 目前我们只提供基本的解析结果
          result.hasProtobufData = true
          result.protobufLength = pbBuffer.length
        } catch (error) {
          loggerError('[LiveWebSocket] 解析 protobuf 数据失败:', error)
        }
      }

      return result
    } catch (error) {
      loggerError('[LiveWebSocket] 解析互动消息失败:', error)
      return {
        action: '互动消息',
        uname: '解析失败',
        uid: 0,
        timestamp: Date.now(),
        raw: data
      }
    }
  }

  // 开始心跳
  private startHeartbeat(): void {
    // 如果已经被销毁，不启动心跳
    if (this.disposed) {
      return
    }

    this.heartbeatTimer = setInterval(async () => {
      // 如果已经被销毁或者不在直播间中，停止心跳
      if (this.disposed || !this.ws || !this.isConnected || !this.currentRoomId) {
        this.stopHeartbeat()
        return
      }

      // 发送WebSocket心跳包
      const heartbeatPacket = this.createPacket(WSOperation.HEARTBEAT, Buffer.alloc(0), 1)
      this.ws.send(heartbeatPacket)

      // 发送HTTP心跳上报
      try {
        await this.liveRoomAPI?.heartbeat(this.currentRoomId)
      } catch (error) {
        loggerError(`[LiveWebSocket] HTTP心跳上报失败:`, error)
      }
    }, 30000) // 30秒心跳
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 断开连接
  private disconnect(): void {
    this.isConnected = false
    this.stopHeartbeat()

    // 重置重连计数，防止后续意外重连
    this.reconnectAttempts = 0

    if (this.ws) {
      // 移除所有事件监听器，防止触发重连
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }

    loginfolive(`WebSocket连接已断开`)
  }

  // 获取当前房间ID
  getCurrentRoomId(): number | null {
    return this.currentRoomId
  }

  // 检查是否已连接
  isConnectedToRoom(): boolean {
    return this.isConnected && this.currentRoomId !== null
  }
}