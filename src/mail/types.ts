import type { Logger } from '../core/logger'

export type Mailbox = {
  /** 邮箱地址，用于提交 Superalink 注册表单。 */
  email: string
  /** 邮箱服务返回的访问令牌或会话标识。 */
  token: string
  /** 邮箱服务内部密码，部分供应商需要。 */
  password?: string
  /** 邮箱供应商名称，便于日志和结果定位。 */
  provider: string
  /** 供应商扩展信息，避免业务代码硬编码特殊字段。 */
  metadata?: Record<string, string>
}

export type MailMessage = {
  /** 邮件唯一标识，轮询去重使用。 */
  id?: string
  /** 发件人地址或名称。 */
  from?: string
  /** 邮件标题。 */
  subject?: string
  /** 纯文本正文。 */
  text?: string
  /** HTML 正文。 */
  html?: string
  /** 接收时间。 */
  receivedAt?: string
}

export type MailProvider = {
  name: string
  createMailbox(log: Logger): Promise<Mailbox>
  listMessages(mailbox: Mailbox, log: Logger): Promise<MailMessage[]>
}
