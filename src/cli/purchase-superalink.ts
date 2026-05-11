import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import type { Browser, Page } from 'playwright'
import { createLogger } from '../core/logger'
import { generateSuperalinkPassword, validateSuperalinkPassword } from '../core/password'
import { readJsonFile, writeJsonFile } from '../core/utils'
import type { SuperalinkEsimMailInfo } from '../mail/content'
import {
  createMailboxWithFallback,
  findProviderForMailbox,
  waitForSuperalinkCreatePasswordLink,
  waitForSuperalinkEsimMailInfo,
  type MailProviderName
} from '../mail'
import type { Mailbox, MailProvider } from '../mail/types'
import { captureFailure as captureRegistrationFailure, finishSuperalinkPasswordCreation, submitSuperalinkInitialRegisterForm } from '../superalink/registration'
import {
  capturePurchaseFailure,
  prepareSuperalinkPurchase
} from '../superalink/purchase'
import type { SuperalinkPurchaseOptions, SuperalinkPurchaseResult, SuperalinkRegisterOptions, SuperalinkRegisterResult } from '../superalink/types'

type CliOptions = {
  affiliateUrl: string
  affiliateCode: string
  countrySlug?: string
  productUrl?: string
  durationDays: number
  option: string
  quantity: number
  currency: string
  email?: string
  provider: MailProviderName
  password?: string
  firstName: string
  lastName?: string
  registerAccount: boolean
  showRegister: boolean
  whatsappNumber?: string
  headless: boolean
  waitForPayment: boolean
  paymentWaitMs: number
  mailWaitMs: number
  intervalMs: number
  debug: boolean
  timeoutMs: number
  outputPath: string
  proxyUrl?: string
  locale: string
  baseUrl: string
  expectedSku?: string
}

type PurchaseRecord = SuperalinkPurchaseResult & {
  createdAt: string
  accountRegistered?: boolean
  account?: SuperalinkRegisterResult
  mailProvider?: string
  mailbox?: Mailbox
}

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const has = (name: string): boolean => argv.includes(name)

  const affiliateUrl = get('--affiliateUrl') || get('--affUrl') || 'https://www.superalink.com/destination/aff/FRONT0000'
  const affiliateCode = get('--affiliateCode') || get('--affCode') || extractAffiliateCode(affiliateUrl) || 'FRONT0000'
  const headless = has('--headless')

  return {
    affiliateUrl,
    affiliateCode,
    countrySlug: get('--country') || get('--countrySlug'),
    productUrl: get('--productUrl'),
    durationDays: Number.parseInt(get('--durationDays') || get('--days') || '', 10) || 4,
    option: get('--option') || 'unlimited',
    quantity: Number.parseInt(get('--quantity') || get('--qty') || '', 10) || 1,
    currency: (get('--currency') || 'THB').toUpperCase(),
    email: get('--email'),
    provider: (get('--mailProvider') || get('--provider') || 'auto') as MailProviderName,
    password: get('--password'),
    firstName: get('--firstName') || process.env.SUPERALINK_FIRST_NAME || 'Esim',
    lastName: get('--lastName') || process.env.SUPERALINK_LAST_NAME || 'Auto',
    registerAccount: !has('--skipRegisterAccount'),
    showRegister: has('--showRegister'),
    whatsappNumber: get('--whatsapp') || get('--whatsappNumber'),
    headless,
    waitForPayment: !headless && !has('--noWaitPayment'),
    paymentWaitMs: (Number.parseInt(get('--paymentWaitMin') || '', 10) || 20) * 60 * 1000,
    mailWaitMs: (Number.parseInt(get('--mailWaitMin') || '', 10) || 10) * 60 * 1000,
    intervalMs: Number.parseInt(get('--intervalMs') || '', 10) || 5000,
    debug: has('--debug'),
    timeoutMs: Number.parseInt(get('--timeoutMs') || '', 10) || (Number.parseInt(get('--timeoutSec') || '', 10) || 60) * 1000,
    outputPath: get('--output') || 'output/superalink-purchases.json',
    proxyUrl: get('--proxyUrl') || get('--proxy') || process.env.SUPERALINK_PROXY_URL,
    locale: get('--locale') || 'en',
    baseUrl: (get('--baseUrl') || 'https://www.superalink.com').replace(/\/+$/g, ''),
    expectedSku: get('--expectedSku')
  }
}

function assertOptions(options: CliOptions): void {
  if (!options.productUrl && !options.countrySlug) {
    throw new Error('缺少购买目的地。推荐传 --country china-mainland，或传 --productUrl 完整产品页')
  }

  if (options.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
    throw new Error(`邮箱格式异常: ${options.email}`)
  }

  if (!['auto', '215im', 'tempmail-lol', '1secmail'].includes(options.provider)) {
    throw new Error(`不支持的邮箱供应商: ${options.provider}`)
  }

  if (!Number.isInteger(options.durationDays) || options.durationDays < 1 || options.durationDays > 365) {
    throw new Error(`购买天数不合法: ${options.durationDays}`)
  }

  if (!Number.isInteger(options.quantity) || options.quantity < 1 || options.quantity > 20) {
    throw new Error(`购买数量不合法: ${options.quantity}`)
  }

  if (!/^[A-Z]{3}$/.test(options.currency)) {
    throw new Error(`货币代码不合法: ${options.currency}`)
  }
}

function toPurchaseOptions(cli: CliOptions, email: string): SuperalinkPurchaseOptions {
  return {
    locale: cli.locale,
    baseUrl: cli.baseUrl,
    affiliateUrl: cli.affiliateUrl,
    affiliateCode: cli.affiliateCode,
    countrySlug: cli.countrySlug,
    productUrl: cli.productUrl,
    durationDays: cli.durationDays,
    option: cli.option,
    quantity: cli.quantity,
    currency: cli.currency,
    email,
    password: cli.password,
    whatsappNumber: cli.whatsappNumber,
    headless: cli.headless,
    proxyUrl: cli.proxyUrl,
    timeoutMs: cli.timeoutMs,
    screenshotDir: resolve('output/screenshots'),
    expectedSku: cli.expectedSku
  }
}

function toRegisterOptions(cli: CliOptions, email: string, password: string): SuperalinkRegisterOptions {
  return {
    locale: cli.locale,
    baseUrl: cli.baseUrl,
    email,
    firstName: cli.firstName.trim(),
    lastName: cli.lastName?.trim(),
    password,
    headless: !cli.showRegister,
    proxyUrl: cli.proxyUrl,
    timeoutMs: cli.timeoutMs,
    screenshotDir: resolve('output/screenshots')
  }
}

async function appendResult(path: string, record: PurchaseRecord): Promise<void> {
  const absPath = resolve(path)
  const records = await readJsonFile<PurchaseRecord[]>(absPath, [])
  records.push(record)
  await writeJsonFile(absPath, records)
}

async function registerAccountIfNeeded(
  cli: CliOptions,
  mailbox: Mailbox,
  provider: MailProvider,
  password: string,
  log: ReturnType<typeof createLogger>
): Promise<SuperalinkRegisterResult | undefined> {
  if (!cli.registerAccount) {
    log.warn('[注册] 已跳过 Superalink 账号注册，本地仍会保存生成的密码')
    return undefined
  }

  const options = toRegisterOptions(cli, mailbox.email, password)
  let browser: Browser | undefined
  let page: Page | undefined

  try {
    log.step('后台注册 Superalink 账号')
    const initial = await submitSuperalinkInitialRegisterForm(options, log)
    browser = initial.browser
    page = initial.page

    const link = await waitForSuperalinkCreatePasswordLink(provider, mailbox, {
      timeoutMs: cli.timeoutMs * 2,
      intervalMs: cli.intervalMs
    }, log)

    const result = await finishSuperalinkPasswordCreation(browser, page, options, link, log)
    log.info('[注册] Superalink 账号注册完成')
    return result
  } catch (error) {
    await captureRegistrationFailure(page, options, log)
    await browser?.close().catch(() => undefined)
    throw error
  }
}

async function waitForPaymentAndCollect(
  cli: CliOptions,
  page: Page,
  mailbox: Mailbox,
  provider: MailProvider,
  log: ReturnType<typeof createLogger>
): Promise<Partial<SuperalinkPurchaseResult>> {
  if (!cli.waitForPayment) {
    return { paymentStatus: 'ready_for_payment' }
  }

  log.warn('[支付] 浏览器已停在支付页。你只需要处理人机验证和真实支付，脚本会等待支付完成后收集 eSIM 邮件')
  const enterSignal = createEnterSignal('支付完成后如果页面没有自动跳转，可以按 Enter 立即开始收集邮箱里的 eSIM 信息: ')
  const detected = waitForPaymentCompletion(page, cli.paymentWaitMs, log)
  const signal = await Promise.race([detected, enterSignal.promise])
  enterSignal.close()

  const postPaymentPageText = await page.locator('body').innerText().catch(() => '')
  const postPaymentScreenshotPath = await capturePostPaymentScreenshot(page, log)

  let esimMailInfo: SuperalinkEsimMailInfo[] = []
  try {
    esimMailInfo = await waitForSuperalinkEsimMailInfo(provider, mailbox, {
      timeoutMs: cli.mailWaitMs,
      intervalMs: cli.intervalMs
    }, log)
  } catch (error) {
    log.warn(`[邮箱] 支付后未收集到 eSIM 邮件: ${error instanceof Error ? error.message : String(error)}`)
  }

  return {
    paymentStatus: signal.paymentStatus,
    postPaymentUrl: page.url(),
    postPaymentPageText: postPaymentPageText.slice(0, 5000),
    postPaymentScreenshotPath,
    esimMailInfo
  }
}

function createEnterSignal(question: string): { promise: Promise<{ paymentStatus: 'payment_manual_continue' }>; close(): void } {
  const rl = createInterface({ input, output })
  return {
    promise: rl.question(question)
      .then(() => ({ paymentStatus: 'payment_manual_continue' as const }))
      .catch(() => ({ paymentStatus: 'payment_manual_continue' as const })),
    close() {
      rl.close()
    }
  }
}

async function waitForPaymentCompletion(
  page: Page,
  timeoutMs: number,
  log: ReturnType<typeof createLogger>
): Promise<{ paymentStatus: 'payment_detected' | 'payment_timeout' }> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const text = await page.locator('body').innerText().catch(() => '')
    const url = page.url()
    if (isPaymentComplete(url, text)) {
      log.info('[支付] 已检测到支付完成状态')
      return { paymentStatus: 'payment_detected' }
    }
    if (/verification failed|troubleshoot/i.test(text)) {
      log.warn('[人机验证] 页面显示验证失败，请在浏览器里手动处理后继续支付')
    }
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  log.warn('[支付] 等待支付完成超时，将继续尝试收集邮箱信息')
  return { paymentStatus: 'payment_timeout' }
}

function isPaymentComplete(url: string, text: string): boolean {
  const haystack = `${url}\n${text}`.toLowerCase()
  return /payment\s*(successful|complete|completed)|purchase\s*(successful|complete|completed)|order\s*(confirmed|complete|completed)|thank you|my voucher|start installation/.test(haystack)
}

async function capturePostPaymentScreenshot(page: Page, log: ReturnType<typeof createLogger>): Promise<string | undefined> {
  try {
    const dir = resolve('output/screenshots')
    await mkdir(dir, { recursive: true })
    const file = join(dir, `superalink-post-payment-${Date.now()}.png`)
    await page.screenshot({ path: file, fullPage: true })
    log.info(`[调试] 已保存支付后截图: ${file}`)
    return file
  } catch (error) {
    log.warn(`[调试] 保存支付后截图失败: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const log = createLogger({ debug: cli.debug })
  assertOptions(cli)

  let mailbox: Mailbox | undefined
  let provider: MailProvider | undefined
  let browser: Browser | undefined
  let page: Page | undefined
  let purchaseOptions: SuperalinkPurchaseOptions | undefined
  let account: SuperalinkRegisterResult | undefined

  try {
    const password = cli.password || generateSuperalinkPassword()
    const validation = validateSuperalinkPassword(password)
    if (!validation.valid) {
      throw new Error('密码不满足 Superalink 规则，需要大小写字母、数字、符号且不少于 6 位')
    }
    cli.password = password

    if (!cli.email) {
      mailbox = await createMailboxWithFallback(cli.provider, log)
      provider = findProviderForMailbox(cli.provider, mailbox, log)
    } else {
      throw new Error('当前新建 eSIM 流程需要自动邮箱，方便支付后读取 eSIM 邮件。请去掉 --email')
    }

    account = await registerAccountIfNeeded(cli, mailbox, provider, password, log)

    purchaseOptions = toPurchaseOptions(cli, mailbox.email)
    const prepared = await prepareSuperalinkPurchase(purchaseOptions, log)
    browser = prepared.browser
    page = prepared.page

    const postPayment = await waitForPaymentAndCollect(cli, page, mailbox, provider, log)

    await appendResult(cli.outputPath, {
      ...prepared.result,
      ...postPayment,
      password,
      accountRegistered: Boolean(account),
      account,
      mailProvider: mailbox?.provider,
      mailbox,
      createdAt: new Date().toISOString()
    })
    log.info(`[完成] eSIM 记录已保存: ${resolve(cli.outputPath)}`)
    log.info(`[完成] Checkout URL: ${prepared.result.checkoutUrl}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error(`[失败] ${message}`)
    await capturePurchaseFailure(page, purchaseOptions ?? toPurchaseOptions(cli, cli.email || mailbox?.email || 'unknown@example.com'), log)
    process.exitCode = 1
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined)
    }
  }
}

function extractAffiliateCode(url: string): string | undefined {
  const match = url.match(/\/aff\/([^/?#]+)/i)
  return match?.[1]
}

main().catch(error => {
  process.stderr.write(`[FATAL] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
