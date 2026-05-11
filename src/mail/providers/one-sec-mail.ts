import type { Logger } from '../../core/logger'
import type { Mailbox, MailMessage, MailProvider } from '../types'

type OneSecMailListItem = {
  id: number
  from?: string
  subject?: string
  date?: string
}

type OneSecMailDetail = {
  from?: string
  subject?: string
  date?: string
  body?: string
  textBody?: string
  htmlBody?: string
}

export class OneSecMailProvider implements MailProvider {
  readonly name = '1secmail'

  async createMailbox(log: Logger): Promise<Mailbox> {
    log.info('[邮箱] 使用 1secmail 创建邮箱')
    const response = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', {
      headers: { 'Accept': 'application/json' }
    })

    const text = await response.text()
    if (!response.ok) {
      throw new Error(`1secmail 创建邮箱失败: ${response.status} ${text}`)
    }

    const addresses = JSON.parse(text) as string[]
    const email = addresses[0]
    if (!email || !email.includes('@')) {
      throw new Error(`1secmail 创建邮箱返回异常: ${text}`)
    }

    return {
      email,
      token: email,
      provider: this.name
    }
  }

  async listMessages(mailbox: Mailbox, log: Logger): Promise<MailMessage[]> {
    const [login, domain] = mailbox.email.split('@')
    if (!login || !domain) return []

    const listUrl = `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
    const response = await fetch(listUrl, { headers: { 'Accept': 'application/json' } })
    const text = await response.text()

    if (!response.ok) {
      log.warn(`[邮箱] 1secmail 拉取邮件失败: ${response.status} ${text}`)
      return []
    }

    const list = JSON.parse(text) as OneSecMailListItem[]
    const result: MailMessage[] = []

    for (const item of list) {
      const detailUrl = `https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${item.id}`
      const detailResponse = await fetch(detailUrl, { headers: { 'Accept': 'application/json' } })
      if (!detailResponse.ok) continue

      const detail = await detailResponse.json() as OneSecMailDetail
      result.push({
        id: String(item.id),
        from: detail.from ?? item.from,
        subject: detail.subject ?? item.subject,
        text: detail.textBody ?? detail.body,
        html: detail.htmlBody,
        receivedAt: detail.date ?? item.date
      })
    }

    return result
  }
}
