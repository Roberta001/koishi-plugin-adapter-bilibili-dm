// 工具函数集合
import { logInfo } from '../index';
import { Context } from 'koishi';
import { resolve } from 'node:path';

/**
 * 验证UID是否为有效的数字
 * @param uid UID字符串
 * @returns 是否为有效的数字UID
 */
export function isValidUid(uid: string): boolean
{
    return /^\d+$/.test(uid);
}

/**
 * 检查UID列表中是否包含通配符
 * @param blockedUids 屏蔽的UID列表
 * @returns 是否包含通配符
 */
export function hasWildcardUid(blockedUids: Array<{ name: string; uid: string; }>): boolean
{
    return blockedUids.some(item => item.uid.includes('*'));
}

/**
 * 检查是否应该忽略所有私信
 * @param blockedUids 屏蔽的UID列表
 * @returns 是否忽略所有私信
 */
export function shouldIgnoreAllPrivateMessages(blockedUids: Array<{ name: string; uid: string; }>): boolean
{
    return hasWildcardUid(blockedUids);
}

/**
 * 检查消息是否应该被屏蔽
 * @param senderUid 发送者UID
 * @param blockedUids 屏蔽的UID列表
 * @returns 是否屏蔽该消息
 */
export function shouldBlockMessage(senderUid: string, blockedUids: Array<{ name: string; uid: string; }>): boolean
{
    // 如果包含通配符，忽略所有私信
    if (shouldIgnoreAllPrivateMessages(blockedUids))
    {
        logInfo(`检测到通配符配置，忽略所有私信消息`);
        return true;
    }

    // 检查是否在屏蔽列表中
    const shouldBlock = blockedUids.some(blocked =>
    {
        // 只验证有效的数字UID
        if (!isValidUid(blocked.uid))
        {
            logInfo(`忽略无效的屏蔽UID配置: ${blocked.uid} (名称: ${blocked.name})`);
            return false;
        }
        return blocked.uid === senderUid;
    });

    if (shouldBlock)
    {
        logInfo(`屏蔽来自UID ${senderUid} 的消息`);
    }

    return shouldBlock;
}

/**
 * 过滤无效的屏蔽配置
 * @param blockedUids 原始屏蔽UID列表
 * @returns 过滤后的有效配置
 */
export function filterValidBlockedUids(blockedUids: Array<{ name: string; uid: string; }>): Array<{ name: string; uid: string; }>
{
    return blockedUids.filter(item =>
    {
        const isValid = isValidUid(item.uid) || item.uid.includes('*');
        if (!isValid)
        {
            logInfo(`过滤无效的屏蔽配置: UID=${item.uid}, 名称=${item.name}`);
        }
        return isValid;
    });
}

/**
 * 获取适配器的数据文件路径
 * @param ctx Koishi 上下文
 * @param selfId 机器人实例的 selfId
 * @param subpaths 文件或子目录路径
 * @returns 完整的文件路径
 */
export function getDataFilePath(ctx: Context, selfId: string, ...subpaths: string[]): string
{
    if (!selfId)
    {
        // 在没有 selfId 的情况下，直接返回基础数据目录
        return resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm');
    }
    // 为每个 selfId 创建独立的子目录
    return resolve(ctx.baseDir, 'data', 'adapter-bilibili-dm', selfId, ...subpaths);
}