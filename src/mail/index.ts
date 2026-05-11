import type { Logger } from '../core/logger'
import { sleep } from '../core/utils'
import { extractSuperalinkCreatePasswordLink, extractSuperalinkEsimMailInfo, htmlToText, type SuperalinkEsimMailInfo } from './content'
import { OneSecMailProvider } from './providers/one-sec-mail'
import { TempMailLolProvider } from './providers/tempmail-lol'
import { YydsMailProvider } from './providers/yyds-mail'
import type { Mailbox, MailMessage, MailProvider } from './types'

export type MailProviderName = 'auto' | '215im' | 'tempmail-lol' | '1secmail'

export type WaitForSuperalinkMailOptions = {
  timeoutMs: number
  intervalMs: number
}

export function createMailProviders(providerName: MailProviderName, log: Logger): MailProvider[] {
  const providers: MailProvider[] = []
  const apiKey = process.env.YYDS_MAIL_API_KEY || process.env.MALIAPI_215_API_KEY

  if ((providerName === 'auto' || providerName === '215im') && apiKey) {
    providers.push(new YydsMailProvider(apiKey))
  } else if (providerName === '215im') {
    log.warn('[邮箱] 指定 215.im，但缺少 YYDS_MAIL_API_KEY 或 MALIAPI_215_API_KEY')
  }

  if (providerName === 'auto' || providerName === 'tempmail-lol') {
    providers.push(new TempMailLolProvider())
  }

  if (providerName === 'auto' || providerName === '1secmail') {
    providers.push(new OneSecMailProvider())
  }

  return providers
}

export async function createMailboxWithFallback(providerName: MailProviderName, log: Logger): Promise<Mailbox> {
  const providers = createMailProviders(providerName, log)
  if (providers.length === 0) {
    throw new Error('没有可用邮箱供应商，请检查 MAIL_PROVIDER 或 YYDS_MAIL_API_KEY 配置')
  }

  const errors: string[] = []
  for (const provider of providers) {
    try {
      const mailbox = await provider.createMailbox(log)
      log.info(`[邮箱] 创建成功: ${mailbox.email} provider=${mailbox.provider}`)
      return mailbox
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${provider.name}: ${message}`)
      log.warn(`[邮箱] ${provider.name} 创建失败，继续尝试下一个供应商: ${message}`)
    }
  }

  throw new Error(`所有邮箱供应商都创建失败: ${errors.join(' | ')}`)
}

export async function waitForSuperalinkCreatePasswordLink(
  provider: MailProvider,
  mailbox: Mailbox,
  options: WaitForSuperalinkMailOptions,
  log: Logger
): Promise<{ url?: string; token?: string; message: MailMessage }> {
  const startedAt = Date.now()
  const seen = new Set<string>()

  while (Date.now() - startedAt < options.timeoutMs) {
    const messages = await provider.listMessages(mailbox, log)
    log.debug(`[邮箱] 本轮拉取 ${messages.length} 封邮件`)

    for (const message of messages) {
      const key = message.id ?? `${message.subject ?? ''}:${message.receivedAt ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)

      const content = `${message.subject ?? ''}\n${message.text ?? ''}\n${message.html ?? ''}`
      const normalizedText = htmlToText(content).toLowerCase()
      const from = (message.from ?? '').toLowerCase()

      log.info(`[邮箱] 检查邮件 from=${from || '-'} subject=${message.subject ?? '-'}`)
      const looksLikeSuperalink = from.includes('superalink') || normalizedText.includes('superalink') || normalizedText.includes('supera link')
      if (!looksLikeSuperalink) {
        log.debug('[邮箱] 邮件来源或正文未命中 Superalink，跳过')
        continue
      }

      const link = extractSuperalinkCreatePasswordLink(content)
      if (link?.url || link?.token) {
        log.info('[邮箱] 已解析到 Superalink 创建密码链接或 token')
        return { ...link, message }
      }
    }

    await sleep(options.intervalMs)
  }

  throw new Error(`等待 Superalink 注册邮件超时，邮箱: ${mailbox.email}`)
}

export async function waitForSuperalinkEsimMailInfo(
  provider: MailProvider,
  mailbox: Mailbox,
  options: WaitForSuperalinkMailOptions,
  log: Logger
): Promise<SuperalinkEsimMailInfo[]> {
  const startedAt = Date.now()
  const matched = new Map<string, SuperalinkEsimMailInfo>()

  while (Date.now() - startedAt < options.timeoutMs) {
    const messages = await provider.listMessages(mailbox, log)
    log.debug(`[邮箱] 本轮拉取 ${messages.length} 封邮件，等待 eSIM 信息`)

    for (const message of messages) {
      const key = message.id ?? `${message.subject ?? ''}:${message.receivedAt ?? ''}`
      if (matched.has(key)) continue

      const content = `${message.subject ?? ''}\n${message.text ?? ''}\n${message.html ?? ''}`
      const info = extractSuperalinkEsimMailInfo(content, message.subject, message.from)
      if (!info) continue

      log.info(`[邮箱] 已识别 eSIM 邮件 subject=${message.subject ?? '-'} from=${message.from ?? '-'}`)
      matched.set(key, info)
    }

    if (matched.size > 0) {
      return Array.from(matched.values())
    }

    await sleep(options.intervalMs)
  }

  throw new Error(`等待 Superalink eSIM 邮件超时，邮箱: ${mailbox.email}`)
}

export function findProviderForMailbox(providerName: MailProviderName, mailbox: Mailbox, log: Logger): MailProvider {
  const providers = createMailProviders(providerName, log)
  const provider = providers.find(item => item.name === mailbox.provider)
  if (!provider) {
    throw new Error(`找不到邮箱 ${mailbox.email} 对应的供应商: ${mailbox.provider}`)
  }
  return provider
}
