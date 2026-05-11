import type { Logger } from '../../core/logger'
import { randomLowercase } from '../../core/utils'
import type { Mailbox, MailMessage, MailProvider } from '../types'

type YydsCreateResponse = {
  success?: boolean
  data?: {
    address?: string
    token?: string
  }
  message?: string
}

type YydsMessageListResponse = {
  success?: boolean
  data?: {
    messages?: Array<{
      id: string
      from?: { address?: string }
      subject?: string
      text?: string
      html?: string[] | string
      receivedAt?: string
      created_at?: string
    }>
  }
}

type YydsMessageDetailResponse = {
  success?: boolean
  data?: {
    text?: string
    html?: string[] | string
  }
}

export class YydsMailProvider implements MailProvider {
  readonly name = '215.im'

  constructor(
    private readonly apiKey: string,
    private readonly domain = '0m0.abrdns.com'
  ) {}

  async createMailbox(log: Logger): Promise<Mailbox> {
    const address = randomLowercase(10)
    log.info(`[邮箱] 使用 215.im 创建邮箱: ${address}@${this.domain}`)

    const response = await fetch('https://maliapi.215.im/v1/accounts', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ address, domain: this.domain })
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`215.im 创建邮箱失败: ${response.status} ${text}`)
    }

    const data = JSON.parse(text) as YydsCreateResponse
    if (!data.success || !data.data?.address || !data.data?.token) {
      throw new Error(`215.im 创建邮箱返回异常: ${text}`)
    }

    return {
      email: data.data.address,
      token: data.data.token,
      provider: this.name,
      metadata: { domain: this.domain }
    }
  }

  async listMessages(mailbox: Mailbox, log: Logger): Promise<MailMessage[]> {
    const listUrl = `https://maliapi.215.im/v1/messages?address=${encodeURIComponent(mailbox.email)}`
    const response = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${mailbox.token}`,
        'Accept': 'application/json'
      }
    })

    const text = await response.text()
    if (!response.ok) {
      log.warn(`[邮箱] 215.im 拉取邮件失败: ${response.status} ${text}`)
      return []
    }

    const data = JSON.parse(text) as YydsMessageListResponse
    const messages = data.data?.messages ?? []
    const result: MailMessage[] = []

    for (const message of messages) {
      let textBody = message.text ?? ''
      let htmlBody = Array.isArray(message.html) ? message.html.join('') : message.html ?? ''

      // 列表接口有时只返回摘要，详情接口能拿到完整链接。
      try {
        const detail = await fetch(`https://maliapi.215.im/v1/messages/${message.id}`, {
          headers: {
            'Authorization': `Bearer ${mailbox.token}`,
            'Accept': 'application/json'
          }
        })
        if (detail.ok) {
          const detailJson = await detail.json() as YydsMessageDetailResponse
          textBody = detailJson.data?.text ?? textBody
          const detailHtml = detailJson.data?.html
          htmlBody = Array.isArray(detailHtml) ? detailHtml.join('') : detailHtml ?? htmlBody
        }
      } catch (error) {
        log.debug(`[邮箱] 215.im 获取邮件详情失败: ${error instanceof Error ? error.message : String(error)}`)
      }

      result.push({
        id: message.id,
        from: message.from?.address,
        subject: message.subject,
        text: textBody,
        html: htmlBody,
        receivedAt: message.receivedAt ?? message.created_at
      })
    }

    return result
  }
}
