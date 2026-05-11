import type { Logger } from '../../core/logger'
import type { Mailbox, MailMessage, MailProvider } from '../types'

type TempMailLolCreateResponse = {
  address?: string
  token?: string
}

type TempMailLolInboxResponse = {
  emails?: Array<{
    id?: string
    from?: string
    subject?: string
    body?: string
    html?: string
    date?: string
  }>
}

export class TempMailLolProvider implements MailProvider {
  readonly name = 'tempmail.lol'

  async createMailbox(log: Logger): Promise<Mailbox> {
    log.info('[邮箱] 使用 tempmail.lol 创建邮箱')
    const response = await fetch('https://api.tempmail.lol/v2/inbox/create', {
      headers: { 'Accept': 'application/json' }
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`tempmail.lol 创建邮箱失败: ${response.status} ${text}`)
    }

    const data = JSON.parse(text) as TempMailLolCreateResponse
    if (!data.address || !data.token) {
      throw new Error(`tempmail.lol 创建邮箱返回异常: ${text}`)
    }

    return {
      email: data.address,
      token: data.token,
      provider: this.name
    }
  }

  async listMessages(mailbox: Mailbox, log: Logger): Promise<MailMessage[]> {
    const response = await fetch(`https://api.tempmail.lol/v2/inbox?token=${encodeURIComponent(mailbox.token)}`, {
      headers: { 'Accept': 'application/json' }
    })

    const text = await response.text()
    if (!response.ok) {
      log.warn(`[邮箱] tempmail.lol 拉取邮件失败: ${response.status} ${text}`)
      return []
    }

    const data = JSON.parse(text) as TempMailLolInboxResponse
    return (data.emails ?? []).map((message, index) => ({
      id: message.id ?? `${message.subject ?? 'mail'}-${index}`,
      from: message.from,
      subject: message.subject,
      text: message.body,
      html: message.html,
      receivedAt: message.date
    }))
  }
}
