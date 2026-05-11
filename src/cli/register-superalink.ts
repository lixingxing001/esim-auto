import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import type { Browser, Page } from 'playwright'
import { createLogger } from '../core/logger'
import { generateSuperalinkPassword, validateSuperalinkPassword } from '../core/password'
import { readJsonFile, writeJsonFile } from '../core/utils'
import {
  createMailboxWithFallback,
  createMailProviders,
  findProviderForMailbox,
  type MailProviderName,
  waitForSuperalinkCreatePasswordLink
} from '../mail'
import type { Mailbox, MailProvider } from '../mail/types'
import {
  captureFailure,
  finishSuperalinkPasswordCreation,
  submitSuperalinkInitialRegisterForm
} from '../superalink/registration'
import type { SuperalinkRegisterOptions, SuperalinkRegisterResult } from '../superalink/types'

type CliOptions = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  provider: MailProviderName
  headless: boolean
  debug: boolean
  timeoutMs: number
  intervalMs: number
  outputPath: string
  proxyUrl?: string
  locale: string
  baseUrl: string
  createPasswordUrl?: string
  token?: string
}

type AccountRecord = SuperalinkRegisterResult & {
  createdAt: string
  provider?: string
}

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const has = (name: string): boolean => argv.includes(name)

  return {
    firstName: get('--firstName') || process.env.SUPERALINK_FIRST_NAME,
    lastName: get('--lastName') || process.env.SUPERALINK_LAST_NAME,
    email: get('--email'),
    password: get('--password'),
    provider: (get('--mailProvider') || get('--provider') || 'auto') as MailProviderName,
    headless: !has('--headed'),
    debug: has('--debug'),
    timeoutMs: Number.parseInt(get('--timeoutMs') || '', 10) || (Number.parseInt(get('--timeoutSec') || '', 10) || 60) * 1000,
    intervalMs: Number.parseInt(get('--intervalMs') || '', 10) || 5000,
    outputPath: get('--output') || 'output/superalink-accounts.json',
    proxyUrl: get('--proxyUrl') || get('--proxy') || process.env.SUPERALINK_PROXY_URL,
    locale: get('--locale') || 'en',
    baseUrl: get('--baseUrl') || 'https://www.superalink.com',
    createPasswordUrl: get('--createPasswordUrl'),
    token: get('--token')
  }
}

function assertOptions(options: CliOptions): asserts options is CliOptions & { firstName: string } {
  if (!options.firstName || options.firstName.trim().length < 2) {
    throw new Error('缺少 firstName，或 firstName 少于 2 个字符。示例: --firstName Lee')
  }

  if (!['auto', '215im', 'tempmail-lol', '1secmail'].includes(options.provider)) {
    throw new Error(`不支持的邮箱供应商: ${options.provider}`)
  }
}

async function appendResult(path: string, record: AccountRecord): Promise<void> {
  const absPath = resolve(path)
  const records = await readJsonFile<AccountRecord[]>(absPath, [])
  records.push(record)
  await writeJsonFile(absPath, records)
}

function toRegisterOptions(cli: CliOptions & { firstName: string }, email: string, password: string): SuperalinkRegisterOptions {
  return {
    locale: cli.locale,
    baseUrl: cli.baseUrl.replace(/\/+$/g, ''),
    email,
    firstName: cli.firstName.trim(),
    lastName: cli.lastName?.trim(),
    password,
    headless: cli.headless,
    proxyUrl: cli.proxyUrl,
    timeoutMs: cli.timeoutMs,
    screenshotDir: resolve('output/screenshots')
  }
}

async function readManualCreatePasswordLink(): Promise<{ url?: string; token?: string }> {
  const rl = createInterface({ input, output })
  try {
    const answer = await rl.question('请输入 Superalink 邮件里的创建密码链接或 token: ')
    const value = answer.trim()
    if (!value) throw new Error('未输入创建密码链接或 token')
    if (/^https?:\/\//i.test(value)) return { url: value }
    return { token: value }
  } finally {
    rl.close()
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const log = createLogger({ debug: cli.debug })
  assertOptions(cli)

  const password = cli.password || generateSuperalinkPassword()
  const validation = validateSuperalinkPassword(password)
  if (!validation.valid) {
    throw new Error('密码不满足 Superalink 规则，需要大小写字母、数字、符号且不少于 6 位')
  }

  let mailbox: Mailbox | undefined
  let provider: MailProvider | undefined
  let browser: Browser | undefined
  let page: Page | undefined
  const email = cli.email || ''

  try {
    const finalEmail = email || (mailbox = await createMailboxWithFallback(cli.provider, log)).email
    if (!cli.email && mailbox) {
      provider = findProviderForMailbox(cli.provider, mailbox, log)
    }

    const registerOptions = toRegisterOptions(cli, finalEmail, password)
    const initial = await submitSuperalinkInitialRegisterForm(registerOptions, log)
    browser = initial.browser
    page = initial.page

    let link: { url?: string; token?: string }
    if (cli.email) {
      if (cli.createPasswordUrl || cli.token) {
        link = { url: cli.createPasswordUrl, token: cli.token }
      } else {
        log.warn('[邮箱] 使用已有邮箱时无法自动读取收件箱，将等待你手动粘贴创建密码链接或 token')
        link = await readManualCreatePasswordLink()
      }
    } else if (mailbox && provider) {
      link = await waitForSuperalinkCreatePasswordLink(provider, mailbox, {
        timeoutMs: cli.timeoutMs * 2,
        intervalMs: cli.intervalMs
      }, log)
    } else {
      throw new Error('邮箱状态异常，缺少 mailbox 或 provider')
    }

    const result = await finishSuperalinkPasswordCreation(browser, page, registerOptions, link, log)
    await appendResult(cli.outputPath, {
      ...result,
      provider: mailbox?.provider,
      createdAt: new Date().toISOString()
    })

    log.info(`[完成] 注册结果已保存: ${resolve(cli.outputPath)}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error(`[失败] ${message}`)
    if (page) {
      const registerOptions = toRegisterOptions(cli, cli.email || mailbox?.email || 'unknown@example.com', password)
      await captureFailure(page, registerOptions, log)
    }
    if (browser) {
      await browser.close().catch(() => undefined)
    }
    process.exitCode = 1
  }
}

main().catch(error => {
  process.stderr.write(`[FATAL] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
