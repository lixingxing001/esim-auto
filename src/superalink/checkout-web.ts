import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Logger } from '../core/logger'
import { generateSuperalinkPassword } from '../core/password'
import { readJsonFile, writeJsonFile } from '../core/utils'
import {
  createMailProviders,
  createMailboxWithFallback,
  findProviderForMailbox,
  waitForSuperalinkEsimMailInfo,
  type MailProviderName
} from '../mail'
import {
  extractUrls,
  extractVerificationCode,
  htmlToText,
  type SuperalinkEsimMailInfo
} from '../mail/content'
import type { Mailbox, MailMessage, MailProvider } from '../mail/types'
import { renderCheckoutPage, type CheckoutCountryOption } from './checkout-web-page'

const STORE_API_BASE = 'https://storefront.api.superalink.com'
const SUPERALINK_BASE_URL = 'https://www.superalink.com'
const DEFAULT_LOCALE = 'en'
const DEFAULT_COUNTRY_CODE = 'CN'
const DEFAULT_CURRENCY = 'THB'
const DEFAULT_COUPON = 'FRONT0000'
const DEFAULT_SKU = 'CN-5GB_UNLIMITED-5GB-5-DAYS'
const DEFAULT_PAYPAL_CLIENT_ID = 'AYM4Jau5hc-pCYrl-ChTmv8fjHtOI6rTGdxVZrDg_INcVfnvxxih982SrPZ3_oygYzASXP_-Euz6PGZp'
const TOKEN_TTL_MS = 30 * 60 * 1000

export type CheckoutWebServerOptions = {
  /** HTTP 监听地址。 */
  host: string
  /** HTTP 监听端口。 */
  port: number
  /** Superalink 官网根地址。 */
  baseUrl: string
  /** Affiliate code，默认 FRONT0000。 */
  affiliateCode: string
  /** Checkout coupon，默认 FRONT0000。 */
  coupon: string
  /** 默认国家或区域代码。 */
  defaultCountryCode: string
  /** 默认支付币种。 */
  defaultCurrency: string
  /** 默认购买数量。 */
  defaultQuantity: number
  /** 邮箱供应商。 */
  mailProvider: MailProviderName
  /** 支付后等待 eSIM 邮件的最长时间。 */
  mailWaitMs: number
  /** 邮箱轮询间隔。 */
  intervalMs: number
  /** 本地记录保存路径。 */
  outputPath: string
  /** PayPal SDK client id。 */
  paypalClientId: string
}

type StorefrontPrice = {
  amount?: number
  display?: string
  formattedAmount?: string
  decimals?: number
  symbol?: string
  inUse?: boolean
}

type StorefrontProduct = {
  sku?: string
  kind?: string
  dataPlan?: {
    option?: string
    FUP?: {
      data?: {
        amount?: number
        unit?: string
      }
    }
    data?: {
      duration?: {
        value?: number
        unit?: string
      }
      data?: {
        amount?: number
        unit?: string
      }
    }
  }
  price?: Record<string, StorefrontPrice>
}

type StorefrontOrder = {
  uniqueId?: string
  currency?: string
  cuts?: unknown[]
  coupons?: unknown[]
  netPrice?: Record<string, StorefrontPrice>
  grossPrice?: Record<string, StorefrontPrice>
  prices?: {
    net?: Record<string, StorefrontPrice>
    gross?: Record<string, StorefrontPrice>
  }
  buyer?: {
    sessionID?: string
  }
  recipient?: {
    email?: string
    phone?: string
  }
  lineItems?: Array<{
    quantity?: number
    product?: StorefrontProduct
    price?: Record<string, StorefrontPrice>
  }>
}

type CheckoutOrderResponse = {
  order?: StorefrontOrder
} & StorefrontOrder

type PaymentIntentResponse = {
  id?: string
  methodIdentifier?: string
  status?: string
  meta?: Record<string, string>
  prices?: {
    net?: Record<string, StorefrontPrice>
    gross?: Record<string, StorefrontPrice>
  }
  message?: string
  error?: string
}

type CatalogProduct = {
  /** 国家或区域代码。 */
  countryCode: string
  /** Superalink SKU。 */
  sku: string
  /** 套餐选项，例如 UNLIMITED。 */
  option: string
  /** 套餐天数。 */
  durationDays: number
  /** 原始数据包文本。 */
  dataText: string
  /** 每日高速流量文本。 */
  dailyDataText: string
  /** 原始价格。 */
  prices: Record<string, StorefrontPrice>
  /** 按已知 coupon cap 估算后的价格。 */
  discountedPrices: Record<string, StorefrontPrice>
}

type PaymentMethodState = {
  paypal: {
    available: boolean
  }
  alipay: {
    available: boolean
    reason?: string
    redirectUrl?: string
  }
}

type CheckoutSessionStatus =
  | 'created'
  | 'paypal_created'
  | 'payment_submitted'
  | 'collecting_mail'
  | 'esim_received'
  | 'mail_timeout'
  | 'payment_failed'

type CheckoutSession = {
  token: string
  createdAt: string
  updatedAt: string
  expiresAt: number
  status: CheckoutSessionStatus
  statusText?: string
  mailbox: Mailbox
  mailProvider: MailProvider
  password: string
  orderId: string
  checkoutUrl: string
  officialProductUrl: string
  buyerSessionId: string
  affiliateCode: string
  coupon: string
  countryCode: string
  sku: string
  quantity: number
  currency: string
  amountDisplay?: string
  paymentMethods: PaymentMethodState
  paypalIntentId?: string
  paypalOrderId?: string
  paypalPreCaptureOk?: boolean
  paymentMethod?: string
  captureResult?: unknown
  esimMailInfo?: SuperalinkEsimMailInfo[]
  error?: string
  collectionStarted?: boolean
}

type CheckoutRecord = Omit<CheckoutSession, 'mailProvider'> & {
  mailProvider: string
}

type StoredMailboxRecord = {
  mailbox?: Mailbox
  email?: string
}

type MailPreview = {
  /** 邮件唯一标识，便于前端稳定渲染。 */
  id?: string
  /** 发件人。 */
  from?: string
  /** 邮件标题。 */
  subject?: string
  /** 接收时间。 */
  receivedAt?: string
  /** 自动提取到的验证码。 */
  verificationCode?: string
  /** 是否命中 Superalink 相关内容。 */
  superalink: boolean
  /** 邮件正文摘要。 */
  textPreview: string
  /** 邮件里的链接，方便人工复制注册或订单入口。 */
  urls: string[]
}

type MailLookupResult = {
  email: string
  provider: string
  source: string
  total: number
  messages: MailPreview[]
}

type PublicEsimMailInfo = {
  /** 邮件标题，便于人工核对 eSIM 凭证来源。 */
  subject?: string
  /** 发件人，便于排查邮件供应商误判。 */
  from?: string
  /** 邮件正文摘要，保留安装说明和订单信息。 */
  textPreview: string
  /** 可能可直接扫码安装的二维码图片地址。 */
  qrImageUrls: string[]
  /** 清洗后的 LPA 或手动激活码。 */
  activationCodes: string[]
  /** Superalink 激活入口链接，通常包含 iOS 和 Android。 */
  activationUrls: string[]
  /** 邮件里的参考链接，排除图片后用于人工打开。 */
  urls: string[]
  /** 邮件里识别到的订单号。 */
  orderIds: string[]
  /** 邮件里识别到的 ICCID。 */
  iccids: string[]
}

type CheckoutHistorySummary = {
  /** 本地会话 token，用于查询详情，不在页面直接展示。 */
  token: string
  /** 当前订单状态。 */
  status: CheckoutSessionStatus
  /** 当前订单状态说明。 */
  statusText?: string
  /** eSIM 接收邮箱。 */
  email: string
  /** 邮箱供应商名称。 */
  mailProvider: string
  /** Superalink 订单号。 */
  orderId: string
  /** 目的地代码。 */
  countryCode: string
  /** 套餐 SKU。 */
  sku: string
  /** 购买数量。 */
  quantity: number
  /** 支付币种。 */
  currency: string
  /** 展示金额。 */
  amountDisplay?: string
  /** 创建时间。 */
  createdAt: string
  /** 最后更新时间。 */
  updatedAt: string
  /** 是否已经收集到 eSIM 邮件信息。 */
  hasEsimMailInfo: boolean
}

type CheckoutHistoryDetail = CheckoutHistorySummary & {
  /** Superalink 官方 checkout 地址。 */
  checkoutUrl: string
  /** Superalink 官方产品页地址。 */
  officialProductUrl: string
  /** 实际支付方式。 */
  paymentMethod?: string
  /** 页面可直接使用的 eSIM 邮件详情。 */
  esimMailInfo: PublicEsimMailInfo[]
  /** 错误信息，方便测试失败时定位。 */
  error?: string
}

const COUNTRY_OPTIONS: CheckoutCountryOption[] = [
  { code: 'CN', name: 'China Mainland', zhName: '中国大陆', flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong', zhName: '中国香港', flag: '🇭🇰' },
  { code: 'HK_MO', name: 'Hong Kong / Macau', zhName: '中国香港 / 澳门', flag: '🇭🇰🇲🇴' },
  { code: 'JP', name: 'Japan', zhName: '日本', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', zhName: '韩国', flag: '🇰🇷' },
  { code: 'KR_JP', name: 'South Korea / Japan', zhName: '韩国 / 日本', flag: '🇰🇷🇯🇵' },
  { code: 'SG', name: 'Singapore', zhName: '新加坡', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', zhName: '泰国', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', zhName: '马来西亚', flag: '🇲🇾' },
  { code: 'VN', name: 'Vietnam', zhName: '越南', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', zhName: '菲律宾', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', zhName: '印度尼西亚', flag: '🇮🇩' },
  { code: 'TW', name: 'Taiwan', zhName: '中国台湾', flag: '🇹🇼' },
  { code: 'US', name: 'United States', zhName: '美国', flag: '🇺🇸' },
  { code: 'US_CA', name: 'United States / Canada', zhName: '美国 / 加拿大', flag: '🇺🇸🇨🇦' },
  { code: 'GB', name: 'United Kingdom', zhName: '英国', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', zhName: '澳大利亚', flag: '🇦🇺' },
  { code: 'FR', name: 'France', zhName: '法国', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', zhName: '德国', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', zhName: '西班牙', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', zhName: '意大利', flag: '🇮🇹' },
  { code: 'MX', name: 'Mexico', zhName: '墨西哥', flag: '🇲🇽' },
  { code: 'SA', name: 'Saudi Arabia', zhName: '沙特阿拉伯', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', zhName: '阿联酋', flag: '🇦🇪' },
  { code: 'WW_109', name: 'Global 109 Countries', zhName: '全球 109 国家和地区', flag: '🌐' }
]

const COUNTRY_SLUGS: Record<string, string> = {
  CN: 'china-mainland',
  HK: 'hong-kong',
  HK_MO: 'hong-kong-macau',
  JP: 'japan',
  KR: 'south-korea',
  KR_JP: 'south-korea-japan',
  SG: 'singapore',
  TH: 'thailand',
  MY: 'malaysia',
  VN: 'vietnam',
  PH: 'philippines',
  ID: 'indonesia',
  TW: 'taiwan',
  US: 'united-states',
  US_CA: 'united-states-canada',
  GB: 'united-kingdom',
  AU: 'australia',
  FR: 'france',
  DE: 'germany',
  ES: 'spain',
  IT: 'italy',
  MX: 'mexico',
  SA: 'saudi-arabia',
  AE: 'united-arab-emirates',
  WW_109: 'global-109-countries'
}

const DEFAULT_VISIBLE_DAYS = [5, 7, 10, 12, 15, 20, 30]
const VISIBLE_DAYS_BY_COUNTRY: Record<string, number[]> = {
  CN: [5, 6, 7, 10, 12, 15, 20, 30],
  US: [5, 6, 7, 10, 12, 15, 20, 30],
  AU: [5, 6, 7, 10, 12, 15, 20, 30],
  KR: [5, 6, 7, 10, 12, 15, 20, 30],
  JP: [5, 6, 7, 10, 12, 15, 20, 30],
  SG: [5, 6, 7, 10, 12, 15, 20, 30],
  TH: [6, 7, 10, 12, 15, 20, 30],
  MY: [6, 7, 10, 12, 15, 20, 30],
  MX: [5, 6, 7, 10, 12, 15, 20, 30],
  SA: [5, 6, 7, 10, 12, 15, 20, 30]
}

const DISCOUNT_CAPS: Record<string, { amount: number; symbol: string; decimals: number }> = {
  THB: { amount: 175, symbol: '฿', decimals: 2 },
  USD: { amount: 5, symbol: '$', decimals: 2 },
  EUR: { amount: 4, symbol: '€', decimals: 2 },
  GBP: { amount: 4, symbol: '£', decimals: 2 },
  SGD: { amount: 6.75, symbol: 'S$', decimals: 2 },
  CNY: { amount: 36.25, symbol: '¥', decimals: 2 },
  JPY: { amount: 775, symbol: '¥', decimals: 0 },
  KRW: { amount: 6750, symbol: '₩', decimals: 0 },
  IDR: { amount: 80000, symbol: 'Rp', decimals: 0 }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  CNY: '¥',
  JPY: '¥',
  KRW: '₩',
  IDR: 'Rp',
  AUD: 'A$',
  HKD: 'HK$',
  TWD: 'NT$'
}

const sessions = new Map<string, CheckoutSession>()
let recordWriteQueue = Promise.resolve()

export async function startSuperalinkCheckoutWebServer(
  options: Partial<CheckoutWebServerOptions>,
  log: Logger
): Promise<{ server: Server; url: string }> {
  const resolved = resolveOptions(options)
  const server = createServer((request, response) => {
    handleRequest(request, response, resolved, log).catch(error => {
      log.error(`[Web] 请求处理失败: ${error instanceof Error ? error.message : String(error)}`)
      sendJson(response, { ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
    })
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(resolved.port, resolved.host, () => resolveListen())
  })

  const url = `http://${resolved.host}:${resolved.port}`
  log.info(`[Web] Superalink checkout 服务已启动: ${url}`)
  return { server, url }
}

function resolveOptions(options: Partial<CheckoutWebServerOptions>): CheckoutWebServerOptions {
  return {
    host: options.host ?? '127.0.0.1',
    port: options.port ?? 53333,
    baseUrl: (options.baseUrl ?? SUPERALINK_BASE_URL).replace(/\/+$/g, ''),
    affiliateCode: options.affiliateCode ?? DEFAULT_COUPON,
    coupon: options.coupon ?? options.affiliateCode ?? DEFAULT_COUPON,
    defaultCountryCode: options.defaultCountryCode ?? DEFAULT_COUNTRY_CODE,
    defaultCurrency: options.defaultCurrency ?? DEFAULT_CURRENCY,
    defaultQuantity: options.defaultQuantity ?? 1,
    mailProvider: options.mailProvider ?? 'auto',
    mailWaitMs: options.mailWaitMs ?? 10 * 60 * 1000,
    intervalMs: options.intervalMs ?? 5000,
    outputPath: resolve(options.outputPath ?? 'output/superalink-web-purchases.json'),
    paypalClientId: options.paypalClientId ?? process.env.SUPERALINK_PAYPAL_CLIENT_ID ?? DEFAULT_PAYPAL_CLIENT_ID
  }
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `${options.host}:${options.port}`}`)
  cleanupSessions()

  if (request.method === 'GET' && requestUrl.pathname === '/') {
    sendHtml(response, renderCheckoutPage({
      defaultCountryCode: options.defaultCountryCode,
      defaultCurrency: options.defaultCurrency,
      defaultQuantity: options.defaultQuantity,
      coupon: options.coupon,
      paypalClientId: options.paypalClientId,
      countries: COUNTRY_OPTIONS
    }))
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
    sendJson(response, { ok: true, time: new Date().toISOString() })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/catalog') {
    const countryCode = normalizeCountryCode(requestUrl.searchParams.get('countryCode') ?? options.defaultCountryCode)
    const products = await catalogForCountry(countryCode, log)
    sendJson(response, {
      ok: true,
      countryCode,
      defaultSku: countryCode === DEFAULT_COUNTRY_CODE ? DEFAULT_SKU : products[0]?.sku,
      products
    })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/checkout/status') {
    const token = requestUrl.searchParams.get('token') ?? ''
    const session = getSession(token)
    sendJson(response, { ok: true, session: publicSession(session) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/checkout/history') {
    const limit = normalizeHistoryLimit(requestUrl.searchParams.get('limit') ?? '20')
    const records = await checkoutHistorySummaries(options, limit, log)
    sendJson(response, { ok: true, outputPath: options.outputPath, records })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/checkout/history/detail') {
    const token = requestUrl.searchParams.get('token') ?? ''
    const detail = await checkoutHistoryDetail(token, options, log)
    sendJson(response, { ok: true, record: detail })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/mail/latest') {
    const body = await readJsonBody<{ email?: string; limit?: number }>(request)
    const result = await latestMailboxMessages(body.email ?? '', body.limit ?? 2, options, log)
    sendJson(response, { ok: true, ...result })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/checkout/create') {
    const body = await readJsonBody<{
      countryCode?: string
      sku?: string
      currency?: string
      quantity?: number
    }>(request)
    const session = await createCheckoutSession(body, options, log)
    sendJson(response, { ok: true, session: publicSession(session) })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/paypal/create') {
    const body = await readJsonBody<{ token?: string }>(request)
    const session = getSession(body.token ?? '')
    await createPaypalOrder(session, options, log)
    sendJson(response, {
      ok: true,
      paypalOrderId: session.paypalOrderId,
      preCaptureOk: session.paypalPreCaptureOk,
      approvalHint: undefined
    })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/paypal/capture') {
    const body = await readJsonBody<{ token?: string; paypalOrderId?: string }>(request)
    const session = getSession(body.token ?? '')
    await capturePaypalOrder(session, body.paypalOrderId ?? '', options, log)
    sendJson(response, { ok: true, session: publicSession(session) })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/alipay/start-collection') {
    const body = await readJsonBody<{ token?: string }>(request)
    const session = getSession(body.token ?? '')
    await startAlipayMailCollection(session, options, log)
    sendJson(response, { ok: true, session: publicSession(session) })
    return
  }

  sendJson(response, { ok: false, error: 'not found' }, 404)
}

async function createCheckoutSession(
  input: {
    countryCode?: string
    sku?: string
    currency?: string
    quantity?: number
  },
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<CheckoutSession> {
  const countryCode = normalizeCountryCode(input.countryCode ?? options.defaultCountryCode)
  const currency = normalizeCurrency(input.currency ?? options.defaultCurrency)
  const quantity = normalizeQuantity(input.quantity ?? options.defaultQuantity)

  log.step(`[Web] 创建 checkout country=${countryCode} sku=${input.sku ?? '-'} currency=${currency} qty=${quantity}`)
  const mailbox = await createMailboxWithFallback(options.mailProvider, log)
  const provider = findProviderForMailbox(options.mailProvider, mailbox, log)
  const password = generateSuperalinkPassword()
  const product = await chooseProduct(countryCode, input.sku, log)

  const productUrl = officialProductUrl(options, countryCode, product, currency)
  const headers = storefrontHeaders(productUrl)
  const payload = {
    sku: product.sku,
    qty: quantity,
    currency,
    isExtension: false,
    coupon: options.coupon
  }
  log.debug(`[Web] checkout payload ${JSON.stringify(payload)}`)
  const createResult = await fetchJson<CheckoutOrderResponse>(`${STORE_API_BASE}/v2/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  }, log, 'create checkout')
  const order = createResult.order ?? createResult
  const orderId = required(order.uniqueId, 'Superalink 未返回 checkout order id')
  const buyerSessionId = required(order.buyer?.sessionID, 'Superalink 未返回 checkout session')
  assertCouponState(order, options.coupon, log)

  const sessionHeaders = storefrontHeaders(productUrl, buyerSessionId)
  const updatedOrder = await updateRecipientEmail(orderId, mailbox.email, sessionHeaders, log)
  assertRecipientCouponStillValid(updatedOrder, options.coupon)

  const amountDisplay = extractAmountDisplay(updatedOrder, currency)
    ?? extractAmountDisplay(order, currency)
    ?? discountedPrice(product, currency)?.display
  const paymentMethods = await detectPaymentMethods(orderId, sessionHeaders, currency, log)
  const token = randomUUID()
  const now = new Date().toISOString()
  const session: CheckoutSession = {
    token,
    createdAt: now,
    updatedAt: now,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    status: 'created',
    mailbox,
    mailProvider: provider,
    password,
    orderId,
    checkoutUrl: checkoutUrl(options, orderId, product, currency),
    officialProductUrl: productUrl,
    buyerSessionId,
    affiliateCode: options.affiliateCode,
    coupon: options.coupon,
    countryCode,
    sku: required(product.sku, '产品缺少 SKU'),
    quantity,
    currency,
    amountDisplay,
    paymentMethods
  }
  sessions.set(token, session)
  await persistSession(session, options, log)
  log.info(`[Web] 订单已创建 order=${orderId} email=${mailbox.email} amount=${amountDisplay ?? '-'}`)
  return session
}

async function latestMailboxMessages(
  rawEmail: string,
  limit: number,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<MailLookupResult> {
  const email = normalizeEmail(rawEmail)
  const safeLimit = Math.min(Math.max(Number.isInteger(limit) ? limit : 2, 1), 5)
  const located = await findRecordedMailbox(email, options)
  if (!located?.mailbox) {
    throw new Error('这个邮箱没有本地访问 token，无法查询收件箱')
  }

  const provider = providerForRecordedMailbox(located.mailbox, log)
  log.info(`[邮箱] 页面查询 email=${email} provider=${located.mailbox.provider} source=${located.source}`)
  const messages = await provider.listMessages(located.mailbox, log)
  const previews = messages
    .map(message => toMailPreview(message))
    .sort((left, right) => messageTime(right.receivedAt) - messageTime(left.receivedAt))

  return {
    email,
    provider: located.mailbox.provider,
    source: located.source,
    total: previews.length,
    messages: previews.slice(0, safeLimit)
  }
}

async function checkoutHistorySummaries(
  options: CheckoutWebServerOptions,
  limit: number,
  log: Logger
): Promise<CheckoutHistorySummary[]> {
  const records = await readCheckoutHistoryRecords(options)
  const summaries = records
    .map(toHistorySummary)
    .filter(record => Boolean(record.orderId || record.email))
    .slice(0, limit)
  log.debug(`[Web] 历史记录读取 count=${summaries.length} output=${options.outputPath}`)
  return summaries
}

async function checkoutHistoryDetail(
  token: string,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<CheckoutHistoryDetail> {
  if (!token) throw new Error('缺少历史记录 token')
  const records = await readCheckoutHistoryRecords(options)
  const record = records.find(item => item.token === token)
  if (!record) throw new Error('历史记录不存在，可能输出文件已被移动或 token 不匹配')
  const detail = toHistoryDetail(record)
  log.debug(`[Web] 历史详情读取 order=${detail.orderId} status=${detail.status}`)
  return detail
}

async function readCheckoutHistoryRecords(options: CheckoutWebServerOptions): Promise<CheckoutRecord[]> {
  const persistedRecords = await readJsonFile<CheckoutRecord[]>(options.outputPath, [])
  const byToken = new Map<string, CheckoutRecord>()

  for (const record of persistedRecords) {
    if (record.token) byToken.set(record.token, record)
  }

  // 活跃会话可能刚完成支付或邮件收集，合并内存态可以避免页面刷新时短暂读不到最新状态。
  for (const session of sessions.values()) {
    byToken.set(session.token, toRecord(session))
  }

  return Array.from(byToken.values()).sort((left, right) => {
    return recordTime(right.updatedAt || right.createdAt) - recordTime(left.updatedAt || left.createdAt)
  })
}

function toHistorySummary(record: CheckoutRecord): CheckoutHistorySummary {
  return {
    token: record.token,
    status: record.status,
    statusText: record.statusText,
    email: record.mailbox?.email ?? '',
    mailProvider: record.mailbox?.provider ?? record.mailProvider,
    orderId: record.orderId,
    countryCode: record.countryCode,
    sku: record.sku,
    quantity: record.quantity,
    currency: record.currency,
    amountDisplay: record.amountDisplay,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasEsimMailInfo: Array.isArray(record.esimMailInfo) && record.esimMailInfo.length > 0
  }
}

function toHistoryDetail(record: CheckoutRecord): CheckoutHistoryDetail {
  return {
    ...toHistorySummary(record),
    checkoutUrl: record.checkoutUrl,
    officialProductUrl: record.officialProductUrl,
    paymentMethod: record.paymentMethod,
    esimMailInfo: (record.esimMailInfo ?? []).map(toPublicEsimMailInfo),
    error: record.error
  }
}

function toPublicEsimMailInfo(info: SuperalinkEsimMailInfo): PublicEsimMailInfo {
  const urls = uniquePublicStrings(info.urls ?? [])
  return {
    subject: info.subject,
    from: info.from,
    textPreview: info.textPreview,
    qrImageUrls: uniquePublicStrings([...(info.imageUrls ?? []), ...urls].filter(isQrImageUrl)).slice(0, 4),
    activationCodes: collectActivationCodes(info),
    activationUrls: urls.filter(isActivationUrl).slice(0, 4),
    urls: urls.filter(url => !isImageUrl(url)).slice(0, 10),
    orderIds: uniquePublicStrings(info.orderIds ?? []),
    iccids: extractIccids(info.textPreview)
  }
}

function collectActivationCodes(info: SuperalinkEsimMailInfo): string[] {
  const rawCodes = [
    ...(info.manualActivationCodes ?? []),
    ...(info.urls ?? []).map(extractActivationCodeFromUrl).filter((value): value is string => Boolean(value))
  ]
  return uniquePublicStrings(rawCodes.map(normalizeActivationCode).filter(Boolean)).slice(0, 6)
}

function extractActivationCodeFromUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl)
    const cardData = url.searchParams.get('carddata')
    return cardData ?? undefined
  } catch {
    const match = rawUrl.match(/[?&]carddata=([^&\s"'<>]+)/i)
    return match?.[1] ? safeDecodeURIComponent(match[1]) : undefined
  }
}

function normalizeActivationCode(rawValue: string): string {
  let value = safeDecodeURIComponent(rawValue.trim())
  if (!value) return ''

  if (value.includes('carddata=')) {
    const extracted = extractActivationCodeFromUrl(value)
    if (extracted) value = extracted
  }

  const lpaMatch = value.match(/LPA:?1\$[^\s"'<>]+/i) ?? value.match(/LPA\$[^\s"'<>]+/i)
  if (lpaMatch?.[0]) value = lpaMatch[0]

  const queryIndex = value.indexOf('&')
  if (queryIndex >= 0) value = value.slice(0, queryIndex)

  return value.replace(/[),.;]+$/g, '').trim()
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isActivationUrl(rawUrl: string): boolean {
  const lower = rawUrl.toLowerCase()
  return lower.includes('activate.superalink.com') || lower.includes('carddata=lpa')
}

function isImageUrl(rawUrl: string): boolean {
  return /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(rawUrl)
}

function isQrImageUrl(rawUrl: string): boolean {
  const lower = rawUrl.toLowerCase()
  if (!isImageUrl(rawUrl)) return false
  if (lower.includes('superalink-qrcode')) return false
  return lower.includes('/qr/') || /qr[-_][a-z0-9-]+\.(png|jpe?g|webp)/i.test(lower)
}

function extractIccids(text: string): string[] {
  const values: string[] = []
  const pattern = /\bICCID\s*[:#]?\s*(\d{12,25})/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match[1]) values.push(match[1])
  }
  return uniquePublicStrings(values)
}

function uniquePublicStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))
}

function recordTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

function normalizeHistoryLimit(value: string): number {
  const limit = Number.parseInt(value, 10)
  if (!Number.isInteger(limit)) return 20
  return Math.min(Math.max(limit, 1), 100)
}

async function createPaypalOrder(
  session: CheckoutSession,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<void> {
  if (session.paypalOrderId && session.paypalIntentId) return
  if (!session.paymentMethods.paypal.available) {
    throw new Error('当前订单未检测到 PayPal 可用')
  }

  log.step(`[PayPal] 创建支付订单 order=${session.orderId}`)
  const headers = storefrontHeaders(session.officialProductUrl, session.buyerSessionId)
  const updatedOrder = await updateRecipientEmail(session.orderId, session.mailbox.email, headers, log)
  assertRecipientCouponStillValid(updatedOrder, session.coupon)

  const intent = await fetchJson<PaymentIntentResponse>(
    `${STORE_API_BASE}/v2/checkout/${encodeURIComponent(session.orderId)}/payment-intents?paymentMethod=paypal`,
    { method: 'POST', headers },
    log,
    'make paypal intent'
  )
  session.paypalIntentId = required(intent.id, 'PayPal intent 缺少 id')
  session.paypalOrderId = required(intent.meta?.orderId, 'PayPal intent 缺少 orderId')

  const preCapture = await postPaymentIntentAction(session.orderId, session.paypalIntentId, 'authorize-capture', headers, log)
  session.paypalPreCaptureOk = preCapture.ok
  session.status = 'paypal_created'
  session.updatedAt = new Date().toISOString()
  session.statusText = preCapture.ok ? 'PayPal 订单已创建' : 'PayPal 预授权返回异常，仍可尝试前端授权'
  await persistSession(session, options, log)
  log.info(`[PayPal] 已创建 paypalOrderId=${session.paypalOrderId} preCapture=${preCapture.ok}`)
}

async function capturePaypalOrder(
  session: CheckoutSession,
  paypalOrderId: string,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<void> {
  if (!paypalOrderId) throw new Error('缺少 PayPal order id')
  if (session.paypalOrderId && session.paypalOrderId !== paypalOrderId) {
    throw new Error('PayPal order id 与当前 checkout session 不匹配')
  }
  const intentId = required(session.paypalIntentId, '缺少 PayPal payment intent id')
  log.step(`[PayPal] 捕获支付 order=${session.orderId} paypalOrder=${paypalOrderId}`)
  const headers = storefrontHeaders(session.officialProductUrl, session.buyerSessionId)
  const capture = await postPaymentIntentAction(session.orderId, intentId, 'capture', headers, log)
  if (!capture.ok) {
    session.status = 'payment_failed'
    session.statusText = 'PayPal capture 失败'
    session.error = JSON.stringify(capture.error)
    session.updatedAt = new Date().toISOString()
    await persistSession(session, options, log)
    throw new Error(`PayPal capture 失败: ${session.error}`)
  }

  session.status = 'payment_submitted'
  session.statusText = 'PayPal 支付已提交'
  session.paymentMethod = 'paypal'
  session.captureResult = capture.intent
  session.updatedAt = new Date().toISOString()
  await persistSession(session, options, log)
  startMailCollection(session, options, log)
}

async function startAlipayMailCollection(
  session: CheckoutSession,
  options: CheckoutWebServerOptions,
  log: Logger
): Promise<void> {
  const alipay = session.paymentMethods.alipay
  if (!alipay.available || !alipay.redirectUrl) {
    throw new Error(`当前订单未检测到 Alipay 可用: ${alipay.reason ?? 'missing redirect url'}`)
  }

  // Alipay 跳转支付在官方页面完成，本地无法 capture，只能在用户打开支付页后开始轮询 eSIM 邮件。
  session.status = 'payment_submitted'
  session.statusText = 'Alipay 支付页已打开，正在等待 Superalink eSIM 邮件'
  session.paymentMethod = 'alipay'
  session.updatedAt = new Date().toISOString()
  await persistSession(session, options, log)
  log.info(`[Alipay] 已打开支付页并开始收集邮件 order=${session.orderId} currency=${session.currency}`)
  startMailCollection(session, options, log)
}

function startMailCollection(session: CheckoutSession, options: CheckoutWebServerOptions, log: Logger): void {
  if (session.collectionStarted) return
  session.collectionStarted = true
  session.status = 'collecting_mail'
  session.statusText = '正在等待 Superalink eSIM 邮件'
  session.updatedAt = new Date().toISOString()
  void persistSession(session, options, log)

  void (async () => {
    try {
      const esimMailInfo = await waitForSuperalinkEsimMailInfo(session.mailProvider, session.mailbox, {
        timeoutMs: options.mailWaitMs,
        intervalMs: options.intervalMs
      }, log)
      session.esimMailInfo = esimMailInfo
      session.status = 'esim_received'
      session.statusText = '已收集 eSIM 邮件'
      session.updatedAt = new Date().toISOString()
      await persistSession(session, options, log)
      log.info(`[邮箱] eSIM 邮件已保存 order=${session.orderId}`)
    } catch (error) {
      session.status = 'mail_timeout'
      session.statusText = '支付后未在等待时间内收到 eSIM 邮件'
      session.error = error instanceof Error ? error.message : String(error)
      session.updatedAt = new Date().toISOString()
      await persistSession(session, options, log)
      log.warn(`[邮箱] eSIM 邮件收集失败 order=${session.orderId}: ${session.error}`)
    }
  })()
}

async function catalogForCountry(countryCode: string, log: Logger): Promise<CatalogProduct[]> {
  const response = await fetchJson<unknown[]>(`${STORE_API_BASE}/products?country_code=${encodeURIComponent(countryCode)}`, {
    method: 'GET',
    headers: {
      'Accept-Language': DEFAULT_LOCALE,
      'User-Agent': 'Mozilla/5.0'
    }
  }, log, 'products')

  const products = response.flatMap(group => {
    if (typeof group !== 'object' || !group) return []
    const maybeProducts = (group as { products?: StorefrontProduct[] }).products
    return Array.isArray(maybeProducts) ? maybeProducts : []
  })

  const catalog = products
    .filter(product => isStorefrontVisibleProduct(product, countryCode))
    .map(product => toCatalogProduct(product, countryCode))
    .filter((item): item is CatalogProduct => Boolean(item))
    .sort((left, right) => left.durationDays - right.durationDays || left.sku.localeCompare(right.sku))

  const seen = new Set<string>()
  return catalog.filter(item => {
    if (seen.has(item.sku)) return false
    seen.add(item.sku)
    return true
  })
}

async function chooseProduct(countryCode: string, sku: string | undefined, log: Logger): Promise<StorefrontProduct> {
  const catalog = await catalogForCountry(countryCode, log)
  if (catalog.length === 0) {
    throw new Error(`当前目的地没有可用套餐: ${countryCode}`)
  }
  const targetSku = sku || (countryCode === DEFAULT_COUNTRY_CODE ? DEFAULT_SKU : catalog[0]?.sku)
  const found = catalog.find(item => item.sku === targetSku)
  if (!found) {
    throw new Error(`套餐 SKU 不在当前目的地可选范围内: ${targetSku}`)
  }

  const response = await fetchJson<unknown[]>(`${STORE_API_BASE}/products?country_code=${encodeURIComponent(countryCode)}`, {
    method: 'GET',
    headers: {
      'Accept-Language': DEFAULT_LOCALE,
      'User-Agent': 'Mozilla/5.0'
    }
  }, log, 'products detail')
  const products = response.flatMap(group => {
    if (typeof group !== 'object' || !group) return []
    return (group as { products?: StorefrontProduct[] }).products ?? []
  })
  const product = products.find(item => item.sku === found.sku)
  if (!product) throw new Error(`官方接口未返回 SKU 详情: ${found.sku}`)
  return product
}

async function updateRecipientEmail(
  orderId: string,
  email: string,
  headers: Record<string, string>,
  log: Logger
): Promise<StorefrontOrder> {
  log.debug(`[Web] 写入 eSIM 接收邮箱 order=${orderId} email=${email}`)
  const payload = {
    voucherRecipientEmail: email,
    voucherRecipientIsSubscribingToNewsletter: false
  }
  const result = await fetchJson<CheckoutOrderResponse>(`${STORE_API_BASE}/v2/checkout/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload)
  }, log, 'update recipient email')
  return result.order ?? result
}

async function detectPaymentMethods(
  orderId: string,
  headers: Record<string, string>,
  currency: string,
  log: Logger
): Promise<PaymentMethodState> {
  const paymentMethods: PaymentMethodState = {
    paypal: { available: currency !== 'CNY' },
    alipay: { available: false }
  }

  // Alipay 当前官方接口返回 Invalid payment method。这里保留探测，避免页面展示无法支付的按钮。
  const alipay = await fetch(`${STORE_API_BASE}/v2/checkout/${encodeURIComponent(orderId)}/payment-intents?paymentMethod=alipay`, {
    method: 'POST',
    headers
  })
  const text = await alipay.text().catch(() => '')
  if (alipay.ok) {
    const parsed = parseJsonLoose<PaymentIntentResponse>(text)
    const redirectUrl = parsed?.meta?.invoiceUrl || parsed?.meta?.redirectUrl
    if (redirectUrl) {
      paymentMethods.alipay = { available: true, redirectUrl }
    } else {
      paymentMethods.alipay = { available: false, reason: 'Alipay 返回结构缺少 redirect url' }
    }
  } else {
    paymentMethods.alipay = { available: false, reason: parsePaymentError(text) || `HTTP ${alipay.status}` }
  }

  log.debug(`[Web] payment methods order=${orderId} paypal=${paymentMethods.paypal.available} alipay=${paymentMethods.alipay.available} reason=${paymentMethods.alipay.reason ?? '-'}`)
  return paymentMethods
}

async function postPaymentIntentAction(
  orderId: string,
  intentId: string,
  action: 'authorize-capture' | 'capture',
  headers: Record<string, string>,
  log: Logger
): Promise<{ ok: boolean; intent?: unknown; error?: unknown }> {
  const url = `${STORE_API_BASE}/v2/checkout/${encodeURIComponent(orderId)}/payment-intents/${encodeURIComponent(intentId)}/${action}`
  const response = await fetch(url, { method: 'POST', headers })
  const text = await response.text().catch(() => '')
  const parsed = parseJsonLoose<{ intent?: unknown; message?: string; error?: unknown }>(text)
  if (!response.ok) {
    log.warn(`[PayPal] ${action} 返回异常 status=${response.status} body=${text.slice(0, 300)}`)
    return { ok: false, error: parsed ?? text }
  }
  return { ok: true, intent: parsed?.intent ?? parsed }
}

function storefrontHeaders(pageUrl: string, buyerSessionId?: string): Record<string, string> {
  const url = new URL(pageUrl)
  const path = `${url.pathname}${url.search}`
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': DEFAULT_LOCALE,
    Origin: SUPERALINK_BASE_URL,
    Referer: pageUrl,
    'User-Agent': 'Mozilla/5.0',
    'X-Page-URL': pageUrl,
    'X-Page-Path': path,
    'X-Page-Origin': SUPERALINK_BASE_URL,
    ...(buyerSessionId ? { Cookie: `splnk_checkout_session=${buyerSessionId}; NEXT_LOCALE=${DEFAULT_LOCALE}` } : {})
  }
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  log: Logger,
  description: string
): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${description} 失败: HTTP ${response.status} ${text.slice(0, 500)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch (error) {
    log.debug(`[Web] JSON 解析失败 ${description}: ${error instanceof Error ? error.message : String(error)}`)
    throw new Error(`${description} 返回不是 JSON`)
  }
}

function isStorefrontVisibleProduct(product: StorefrontProduct, countryCode: string): boolean {
  const days = durationDays(product)
  const data = productDataAmount(product)
  const allowedDays = VISIBLE_DAYS_BY_COUNTRY[countryCode] ?? DEFAULT_VISIBLE_DAYS
  return product.dataPlan?.option === 'UNLIMITED'
    && Number(data.amount ?? 0) === 5
    && String(data.unit ?? '').toUpperCase() === 'GB'
    && days !== undefined
    && allowedDays.includes(days)
    && Boolean(product.sku)
}

function toCatalogProduct(product: StorefrontProduct, countryCode: string): CatalogProduct | undefined {
  const sku = product.sku
  const duration = durationDays(product)
  const data = productDataAmount(product)
  if (!sku || !duration) return undefined
  const dataText = `${data.amount ?? ''}${data.unit ?? ''}`
  return {
    countryCode,
    sku,
    option: product.dataPlan?.option ?? 'UNLIMITED',
    durationDays: duration,
    dataText,
    dailyDataText: dataText,
    prices: product.price ?? {},
    discountedPrices: discountedPrices(product)
  }
}

function productDataAmount(product: StorefrontProduct): { amount?: number; unit?: string } {
  if (product.dataPlan?.option === 'UNLIMITED') {
    return product.dataPlan.FUP?.data ?? {}
  }
  return product.dataPlan?.data?.data ?? {}
}

function durationDays(product: StorefrontProduct): number | undefined {
  const duration = product.dataPlan?.data?.duration
  if (!duration?.value) return undefined
  if (duration.unit === 'MILLISECONDS') return Math.round(duration.value / 86400000)
  if (duration.unit === 'DAYS') return duration.value
  return undefined
}

function discountedPrices(product: StorefrontProduct): Record<string, StorefrontPrice> {
  const result: Record<string, StorefrontPrice> = {}
  for (const [currency, price] of Object.entries(product.price ?? {})) {
    const cap = DISCOUNT_CAPS[currency]
    if (!cap || typeof price.amount !== 'number') continue
    const amount = Math.max(0, roundCurrencyAmount(price.amount - cap.amount, cap.decimals))
    result[currency] = {
      amount,
      decimals: cap.decimals,
      symbol: cap.symbol,
      display: formatPrice(currency, amount),
      formattedAmount: cap.decimals === 0 ? String(Math.round(amount)) : amount.toFixed(cap.decimals),
      inUse: price.inUse
    }
  }
  return result
}

function discountedPrice(product: StorefrontProduct, currency: string): StorefrontPrice | undefined {
  return discountedPrices(product)[currency] ?? product.price?.[currency]
}

function formatPrice(currency: string, amount: number): string {
  const decimals = DISCOUNT_CAPS[currency]?.decimals ?? (['JPY', 'KRW', 'IDR'].includes(currency) ? 0 : 2)
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  return `${symbol}${decimals === 0 ? Math.round(amount) : amount.toFixed(decimals)}`
}

function roundCurrencyAmount(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function extractAmountDisplay(order: StorefrontOrder, currency: string): string | undefined {
  return order.netPrice?.[currency]?.display
    ?? order.prices?.net?.[currency]?.display
    ?? order.grossPrice?.[currency]?.display
    ?? order.prices?.gross?.[currency]?.display
}

function assertCouponState(order: StorefrontOrder, coupon: string, log: Logger): void {
  const payload = JSON.stringify(order).toLowerCase()
  const hasCouponCode = payload.includes(coupon.toLowerCase())
  const hasCuts = Array.isArray(order.cuts) && order.cuts.length > 0
  if (!hasCouponCode && !hasCuts) {
    throw new Error(`优惠校验失败，官方 checkout 没有返回 ${coupon}`)
  }
  log.info(`[优惠] checkout 创建阶段已确认 coupon=${coupon}`)
}

function assertRecipientCouponStillValid(order: StorefrontOrder, coupon: string): void {
  const payload = JSON.stringify(order).toLowerCase()
  const couponRemoved = payload.includes('coupon') && (payload.includes('removed') || payload.includes('invalid') || payload.includes('not applicable'))
  const firstPurchaseOnly = /first[-\s]*(purchase|time)|首次/.test(payload)
  if (couponRemoved || firstPurchaseOnly) {
    throw new Error(`邮箱不满足 ${coupon} 优惠资格，请更换邮箱供应商或稍后重试`)
  }
}

function officialProductUrl(options: CheckoutWebServerOptions, countryCode: string, product: StorefrontProduct, currency: string): string {
  const slug = COUNTRY_SLUGS[countryCode] ?? countryCode.toLowerCase().replaceAll('_', '-')
  const url = new URL(`/${DEFAULT_LOCALE}/esim/${slug}`, options.baseUrl)
  url.searchParams.set('affiliate_code', options.affiliateCode)
  url.searchParams.set('duration', String(durationDays(product) ?? 5))
  url.searchParams.set('option', 'unlimited')
  url.searchParams.set('promo', 'affiliate-influencer')
  url.searchParams.set('utm_source', 'affiliate')
  url.searchParams.set('currency', currency)
  url.searchParams.set('coupon', options.coupon)
  return url.toString()
}

function checkoutUrl(options: CheckoutWebServerOptions, orderId: string, product: StorefrontProduct, currency: string): string {
  const url = new URL(`/${DEFAULT_LOCALE}/checkout/${orderId}`, options.baseUrl)
  url.searchParams.set('affiliate_code', options.affiliateCode)
  url.searchParams.set('duration', String(durationDays(product) ?? 5))
  url.searchParams.set('option', 'unlimited')
  url.searchParams.set('promo', 'affiliate-influencer')
  url.searchParams.set('utm_source', 'affiliate')
  url.searchParams.set('currency', currency)
  url.searchParams.set('coupon', options.coupon)
  return url.toString()
}

function publicSession(session: CheckoutSession): Record<string, unknown> {
  return {
    token: session.token,
    status: session.status,
    statusText: session.statusText,
    email: session.mailbox.email,
    orderId: session.orderId,
    checkoutUrl: session.checkoutUrl,
    officialProductUrl: session.officialProductUrl,
    affiliateCode: session.affiliateCode,
    coupon: session.coupon,
    countryCode: session.countryCode,
    sku: session.sku,
    quantity: session.quantity,
    currency: session.currency,
    amountDisplay: session.amountDisplay,
    paymentMethods: session.paymentMethods,
    paymentMethod: session.paymentMethod,
    esimMailInfo: session.esimMailInfo,
    error: session.error
  }
}

async function findRecordedMailbox(
  email: string,
  options: CheckoutWebServerOptions
): Promise<{ mailbox: Mailbox; source: string } | undefined> {
  const activeSession = Array.from(sessions.values()).find(session => normalizeEmail(session.mailbox.email) === email)
  if (activeSession) {
    return {
      mailbox: activeSession.mailbox,
      source: 'memory'
    }
  }

  for (const path of mailboxRecordPaths(options)) {
    const records = await readJsonFile<StoredMailboxRecord[]>(path, [])
    for (const record of records) {
      const mailbox = mailboxFromRecord(record, email)
      if (mailbox) {
        return { mailbox, source: path }
      }
    }
  }

  return undefined
}

function mailboxRecordPaths(options: CheckoutWebServerOptions): string[] {
  return Array.from(new Set([
    options.outputPath,
    resolve('output/superalink-web-purchases.json'),
    resolve('output/superalink-web-smoke.json'),
    resolve('output/superalink-purchases.json'),
    resolve('output/superalink-purchases-smoke.json'),
    resolve('output/superalink-purchases-smoke-qty.json')
  ]))
}

function mailboxFromRecord(record: StoredMailboxRecord, email: string): Mailbox | undefined {
  const mailbox = record.mailbox
  if (mailbox?.email && normalizeEmail(mailbox.email) === email && mailbox.token && mailbox.provider) {
    return mailbox
  }
  return undefined
}

function providerForRecordedMailbox(mailbox: Mailbox, log: Logger): MailProvider {
  const providerName = providerNameFromMailbox(mailbox.provider)
  const provider = createMailProviders(providerName, log).find(item => item.name === mailbox.provider)
  if (!provider) {
    throw new Error(`邮箱供应商不可用: ${mailbox.provider}`)
  }
  return provider
}

function providerNameFromMailbox(provider: string): MailProviderName {
  const normalized = provider.toLowerCase()
  if (normalized.includes('tempmail')) return 'tempmail-lol'
  if (normalized.includes('1sec')) return '1secmail'
  if (normalized.includes('215') || normalized.includes('yyds')) return '215im'
  return 'auto'
}

function toMailPreview(message: MailMessage): MailPreview {
  const content = `${message.subject ?? ''}\n${message.text ?? ''}\n${message.html ?? ''}`
  const text = htmlToText(content)
  const normalized = `${message.from ?? ''}\n${message.subject ?? ''}\n${text}`.toLowerCase()
  const verificationCode = extractVerificationCode(content) ?? undefined
  return {
    id: message.id,
    from: message.from,
    subject: message.subject,
    receivedAt: message.receivedAt,
    verificationCode,
    superalink: normalized.includes('superalink') || normalized.includes('supera link'),
    textPreview: text.slice(0, 1000),
    urls: extractUrls(content).slice(0, 8)
  }
}

function messageTime(value?: string): number {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

async function persistSession(session: CheckoutSession, options: CheckoutWebServerOptions, log: Logger): Promise<void> {
  const record = toRecord(session)
  recordWriteQueue = recordWriteQueue.then(async () => {
    const records = await readJsonFile<CheckoutRecord[]>(options.outputPath, [])
    const index = records.findIndex(item => item.token === record.token)
    if (index >= 0) records[index] = record
    else records.push(record)
    await writeJsonFile(options.outputPath, records)
  }).catch(error => {
    log.warn(`[Web] 保存记录失败: ${error instanceof Error ? error.message : String(error)}`)
  })
  await recordWriteQueue
}

function toRecord(session: CheckoutSession): CheckoutRecord {
  const { mailProvider, ...rest } = session
  return {
    ...rest,
    mailProvider: mailProvider.name
  }
}

function getSession(token: string): CheckoutSession {
  const session = sessions.get(token)
  if (!session) throw new Error('checkout session 不存在或已过期')
  session.expiresAt = Date.now() + TOKEN_TTL_MS
  return session
}

function cleanupSessions(): void {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now && session.status !== 'collecting_mail') {
      sessions.delete(token)
    }
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {} as T
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

function sendHtml(response: ServerResponse, html: string, status = 200): void {
  const body = Buffer.from(html)
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  })
  response.end(body)
}

function sendJson(response: ServerResponse, payload: unknown, status = 200): void {
  if (response.headersSent) return
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  })
  response.end(body)
}

function normalizeCountryCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z0-9_]{2,12}$/.test(code)) throw new Error(`国家或区域代码异常: ${value}`)
  return code
}

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`币种异常: ${value}`)
  return currency
}

function normalizeQuantity(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error(`购买数量异常: ${value}`)
  }
  return value
}

function normalizeEmail(value: string): string {
  const email = value.normalize('NFKC').trim().toLowerCase().replace('＠', '@').replace('．', '.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`邮箱格式异常: ${value}`)
  }
  return email
}

function required<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null || value === '') throw new Error(message)
  return value
}

function parseJsonLoose<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

function parsePaymentError(value: string): string | undefined {
  const parsed = parseJsonLoose<{ message?: string; error?: string }>(value)
  return parsed?.message ?? parsed?.error
}
