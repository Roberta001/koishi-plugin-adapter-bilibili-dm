// src\bot\messageEncoder.ts
import { Context, MessageEncoder, h } from 'koishi';
import { loggerError } from '../index';
import { BilibiliDmBot } from './bot';

export class BilibiliMessageEncoder extends MessageEncoder<Context, BilibiliDmBot>
{
    private textBuffer = '';

    async flush(): Promise<void>
    {
        if (this.textBuffer)
        {
            await this.flushTextBuffer();
        }
    }

    private async flushTextBuffer(): Promise<void>
    {
        if (this.textBuffer)
        {
            const [type, talkerId] = this.channelId.split(':');
            if (type !== 'private' || !talkerId) return;

            const msgContent = { content: this.textBuffer.replace(/\n+/g, '\n').trim() };
            const msgKey = await this.bot.http.sendMessage(this.bot.selfId, Number(talkerId), JSON.stringify(msgContent), 1);
            if (msgKey)
            {
                this.results.push({ id: msgKey });
            }
            this.textBuffer = '';
        }
    }

    async visit(element: h): Promise<void>
    {
        const { type, attrs, children } = element;

        switch (type)
        {
            case 'text':
                if (attrs.content)
                {
                    this.textBuffer += attrs.content;
                }
                break;

            case 'p':
                this.textBuffer += '\n';
                if (children)
                {
                    for (const child of children)
                    {
                        await this.visit(child);
                    }
                }
                this.textBuffer += '\n';
                break;

            case 'br':
                this.textBuffer += '\n';
                break;

            case 'image':
            case 'img':
                await this.flushTextBuffer();
                await this.sendImage(attrs.url || attrs.src);
                break;

            default:
                // 处理其他元素的子元素
                if (children)
                {
                    for (const child of children)
                    {
                        await this.visit(child);
                    }
                }
                break;
        }
    }

    private async sendImage(imageUrl: string): Promise<void>
    {
        if (!imageUrl) return;

        const [type, talkerId] = this.channelId.split(':');
        if (type !== 'private' || !talkerId) return;

        try
        {
            const imageData = await this.bot.http.safeFileRequest(imageUrl, `下载图片失败，URL: ${imageUrl}`);
            if (!imageData)
            {
                loggerError(`图片下载失败，URL: ${imageUrl}`);
                return;
            }

            const imageBuffer = imageData.data;
            const imageType = imageData.mime || imageData.type;

            const uploadResult = await this.bot.http.uploadImage(imageBuffer);
            if (!uploadResult)
            {
                loggerError(`图片上传失败，URL: ${imageUrl}`);
                return;
            }

            const msgContent = {
                url: uploadResult.image_url,
                width: uploadResult.image_width,
                height: uploadResult.image_height,
                imageType: imageType,
                size: uploadResult.img_size || 0,
                original: 1
            };

            const msgKey = await this.bot.http.sendMessage(this.bot.selfId, Number(talkerId), JSON.stringify(msgContent), 2);
            if (msgKey)
            {
                this.results.push({ id: msgKey });
            }
        } catch (error)
        {
            loggerError('发送图片时发生错误: %o', error);
        }
    }
}