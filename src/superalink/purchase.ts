import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import type { Logger } from '../core/logger'
import { sleep } from '../core/utils'
import type { SuperalinkPurchaseOptions, SuperalinkPurchaseResult } from './types'

type CheckoutOrderResponse = {
  order?: CheckoutOrder
} & CheckoutOrder

type CheckoutOrder = {
  uniqueId?: string
  lineItems?: CheckoutLineItem[]
}

type CheckoutLineItem = {
  product?: {
    sku?: string
    country?: {
      names?: Record<string, string>
      code?: string
    }
  }
  quantity?: number
}

type AffiliateCookieState = {
  affiliateCode?: string
  couponApplied?: string
  showedCoupon?: string
}

type PreparedPurchase = {
  browser: Browser
  page: Page
  result: SuperalinkPurchaseResult
}

export async function prepareSuperalinkPurchase(
  options: SuperalinkPurchaseOptions,
  log: Logger
): Promise<PreparedPurchase> {
  log.step('启动浏览器')
  const browser = await chromium.launch({
    headless: options.headless,
    proxy: options.proxyUrl ? { server: options.proxyUrl } : undefined
  })

  try {
    const host = new URL(options.baseUrl).hostname
    const context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      locale: 'en-US',
      timezoneId: 'Asia/Singapore'
    })
    await context.addCookies([
      {
        name: 'NEXT_LOCALE',
        value: options.locale,
        domain: host,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 30
      },
      {
        name: 'is_locale_checked',
        value: 'true',
        domain: host,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7
      },
      {
        name: 'storefront_v2_currency',
        value: options.currency,
        domain: host,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 30
      }
    ])

    const page = await context.newPage()
    page.setDefaultTimeout(options.timeoutMs)

    let checkoutOrder: CheckoutOrder | undefined
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') {
        log.debug(`[浏览器控制台] ${message.type()} ${message.text()}`)
      }
    })
    page.on('pageerror', error => {
      log.debug(`[页面异常] ${error.message}`)
    })
    page.on('request', request => {
      const url = request.url()
      if (/storefront\.api\.superalink\.com\/v2\/checkout/i.test(url)) {
        log.debug(`[接口请求] ${request.method()} ${url} ${request.postData() ?? ''}`)
      }
    })
    page.on('response', async response => {
      const request = response.request()
      const url = response.url()
      if (!/storefront\.api\.superalink\.com\/v2\/checkout/i.test(url)) return
      if (request.method() !== 'POST' && !/\/v2\/checkout\/[^/]+$/i.test(url)) return
      try {
        const text = await response.text()
        const parsed = JSON.parse(text) as CheckoutOrderResponse
        const order = parsed.order ?? parsed
        if (order?.uniqueId) {
          checkoutOrder = order
          log.info(`[Superalink] 已捕获 checkout 订单: ${order.uniqueId}`)
        }
      } catch (error) {
        log.debug(`[接口响应] checkout 响应解析失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    await visitAffiliateEntry(page, options, log)

    const productUrl = buildProductUrl(options)
    log.step(`打开产品页 ${productUrl}`)
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
    await waitForLoadRelaxed(page, options.timeoutMs, log, '产品页')
    await ensureAffiliateDiscountClaimed(page, options, log)
    await applyQuantityIfNeeded(page, options, log)

    await waitForCheckoutOrder(() => checkoutOrder, options.timeoutMs, log)
    await clickFirstVisible(page.getByRole('button', { name: /Proceed to Payment/i }), options.timeoutMs, 'Proceed to Payment')
    log.info('[页面] 已进入付款前流程，等待 checkout 页面')
    await Promise.race([
      page.waitForURL(url => /\/checkout\//i.test(url.toString()), { timeout: options.timeoutMs }),
      page.locator('#email-form, input[type="email"]').first().waitFor({ state: 'visible', timeout: options.timeoutMs })
    ])
    await waitForLoadRelaxed(page, options.timeoutMs, log, 'checkout 页')

    await fillCheckoutContact(page, options, log)

    const firstLineItem = checkoutOrder?.lineItems?.[0]
    const productSku = firstLineItem?.product?.sku
    if (options.expectedSku && productSku && options.expectedSku !== productSku) {
      throw new Error(`SKU 校验失败，期望 ${options.expectedSku}，实际 ${productSku}`)
    }

    const screenshotPath = await captureCheckoutReady(page, options, log)
    const orderSummaryText = await readOrderSummary(page)
    assertCheckoutDiscountApplied(orderSummaryText, options, log)
    assertCheckoutCurrencyApplied(orderSummaryText, options, log)
    const checkoutUrl = page.url()
    const orderId = checkoutOrder?.uniqueId ?? extractCheckoutOrderId(checkoutUrl)

    log.warn('[付款] 已停在 Pay Now 前，请人工确认金额、套餐、邮箱和支付方式')
    return {
      browser,
      page,
      result: {
        success: true,
        email: options.email,
        password: options.password,
        affiliateCode: options.affiliateCode,
        productUrl,
        checkoutUrl,
        orderId,
        productSku,
        countryName: firstLineItem?.product?.country?.names?.EN,
        quantity: firstLineItem?.quantity ?? options.quantity,
        currency: options.currency,
        orderSummaryText,
        readyForPayment: true,
        paymentStoppedBeforePayNow: true,
        screenshotPath
      }
    }
  } catch (error) {
    await browser.close().catch(() => undefined)
    throw error
  }
}

export async function capturePurchaseFailure(page: Page | undefined, options: SuperalinkPurchaseOptions, log: Logger): Promise<void> {
  if (!page) return
  try {
    await mkdir(options.screenshotDir, { recursive: true })
    const file = join(options.screenshotDir, `superalink-purchase-failure-${Date.now()}.png`)
    await page.screenshot({ path: file, fullPage: true })
    log.warn(`[调试] 已保存失败截图: ${file}`)
  } catch (error) {
    log.warn(`[调试] 保存失败截图失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function buildProductUrl(options: SuperalinkPurchaseOptions): string {
  if (options.productUrl) {
    return normalizeUrl(options.productUrl, options.baseUrl)
  }

  if (!options.countrySlug) {
    throw new Error('缺少 countrySlug，示例: --country china-mainland')
  }

  const url = new URL(`/${options.locale}/esim/${options.countrySlug}`, options.baseUrl)
  url.searchParams.set('affiliate_code', options.affiliateCode)
  url.searchParams.set('duration', String(options.durationDays))
  url.searchParams.set('option', options.option)
  url.searchParams.set('promo', 'affiliate-influencer')
  url.searchParams.set('utm_source', 'affiliate')
  return url.toString()
}

async function visitAffiliateEntry(page: Page, options: SuperalinkPurchaseOptions, log: Logger): Promise<void> {
  log.step(`打开 affiliate 入口 ${options.affiliateUrl}`)
  await page.goto(options.affiliateUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
  await waitForLoadRelaxed(page, options.timeoutMs, log, 'affiliate 页')
  await ensureAffiliateDiscountClaimed(page, options, log)
}

async function acceptCookieIfPresent(page: Page, log: Logger): Promise<void> {
  const buttons = [
    page.getByRole('button', { name: /I understand/i }).first(),
    page.getByRole('button', { name: /Accept/i }).first()
  ]

  for (const button of buttons) {
    try {
      if (await button.isVisible({ timeout: 1500 })) {
        await button.click()
        log.info('[页面] 已处理 Cookie 弹窗')
        return
      }
    } catch {
      continue
    }
  }
}

async function ensureAffiliateDiscountClaimed(page: Page, options: SuperalinkPurchaseOptions, log: Logger): Promise<void> {
  await acceptCookieIfPresent(page, log)

  // 官网优惠由弹窗点击和 Cookie 共同驱动，先走官方按钮，再兜底补齐 checkout 需要的状态。
  const clicked = await claimAffiliateDiscountIfPresent(page, log, Math.min(options.timeoutMs, 12000))
  const state = await waitForAffiliateCookieState(page, options, clicked ? 8000 : 2500)
  if (state.affiliateCode === options.affiliateCode && state.couponApplied === options.affiliateCode) {
    log.info(`[优惠] 已确认 ${options.affiliateCode} 优惠状态`)
    return
  }

  await writeAffiliateDiscountCookies(page, options)
  const fixedState = await readAffiliateCookieState(page, options)
  log.warn(
    `[优惠] 官方弹窗未确认完整优惠状态，已补写 affiliate_code=${fixedState.affiliateCode ?? '空'}、coupon_applied=${fixedState.couponApplied ?? '空'}`
  )
}

async function claimAffiliateDiscountIfPresent(page: Page, log: Logger, timeoutMs: number): Promise<boolean> {
  const button = page.getByRole('button', { name: /Claim Discount/i })
  try {
    await clickFirstVisible(button, timeoutMs, 'Claim Discount')
    log.info('[页面] 已自动点击 Claim Discount 领取优惠')
    await sleep(800)
    return true
  } catch (error) {
    log.debug(`[页面] Claim Discount 未出现或无法点击: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

async function waitForAffiliateCookieState(
  page: Page,
  options: SuperalinkPurchaseOptions,
  timeoutMs: number
): Promise<AffiliateCookieState> {
  const startedAt = Date.now()
  let state = await readAffiliateCookieState(page, options)
  while (Date.now() - startedAt < timeoutMs) {
    if (state.affiliateCode === options.affiliateCode && state.couponApplied === options.affiliateCode) {
      return state
    }
    await sleep(300)
    state = await readAffiliateCookieState(page, options)
  }
  return state
}

async function readAffiliateCookieState(page: Page, options: SuperalinkPurchaseOptions): Promise<AffiliateCookieState> {
  const cookies = await page.context().cookies(options.baseUrl)
  const findCookie = (name: string): string | undefined => cookies.find(cookie => cookie.name === name)?.value
  return {
    affiliateCode: findCookie('affiliate_code'),
    couponApplied: findCookie('coupon_applied'),
    showedCoupon: findCookie('showed_coupon')
  }
}

async function writeAffiliateDiscountCookies(page: Page, options: SuperalinkPurchaseOptions): Promise<void> {
  const host = new URL(options.baseUrl).hostname
  const expires = Math.floor(Date.now() / 1000) + 86400 * 30
  await page.context().addCookies([
    {
      name: 'affiliate_code',
      value: options.affiliateCode,
      domain: host,
      path: '/',
      expires
    },
    {
      name: 'coupon_applied',
      value: options.affiliateCode,
      domain: host,
      path: '/',
      expires
    },
    {
      name: 'showed_coupon',
      value: 'true',
      domain: host,
      path: '/',
      expires
    }
  ])
}

async function fillCheckoutContact(page: Page, options: SuperalinkPurchaseOptions, log: Logger): Promise<void> {
  log.step('填写 checkout 联系信息')
  const emailInput = page.locator('#email-form, input[type="email"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: options.timeoutMs })
  await emailInput.fill(options.email)
  log.info(`[页面] 已填写 eSIM 接收邮箱: ${options.email}`)

  const compatibility = page.locator('#compatibility-toggle').first()
  if (await compatibility.isVisible({ timeout: 5000 }).catch(() => false)) {
    if (!(await compatibility.isChecked().catch(() => false))) {
      await compatibility.check({ force: true }).catch(async () => {
        await compatibility.click({ force: true })
      })
      log.info('[页面] 已勾选 eSIM 设备兼容确认')
    }
  } else {
    log.warn('[页面] 未找到 eSIM 设备兼容确认框')
  }

  if (options.whatsappNumber) {
    const phoneInput = page.locator('input[type="tel"]').first()
    if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await phoneInput.fill(options.whatsappNumber)
      log.info('[页面] 已填写 WhatsApp 号码')
    } else {
      log.warn('[页面] 未找到 WhatsApp 号码输入框')
    }
  }

  await page.getByRole('button', { name: /Pay Now/i }).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {
    log.warn('[页面] Pay Now 按钮暂未可见，可能仍在等待支付组件或 Cloudflare Turnstile')
  })
}

async function applyQuantityIfNeeded(page: Page, options: SuperalinkPurchaseOptions, log: Logger): Promise<void> {
  if (options.quantity <= 1) return

  log.step(`设置购买数量 ${options.quantity}`)
  for (let current = 1; current < options.quantity; current++) {
    const plusButton = await findQuantityPlusButton(page)
    if (!plusButton) {
      throw new Error('未找到数量加号按钮，无法设置购买数量')
    }
    await plusButton.click()
    await sleep(800)
    log.debug(`[页面] 已点击数量加号，第 ${current} 次`)
  }
  log.info(`[页面] 已设置购买数量: ${options.quantity}`)
}

async function findQuantityPlusButton(page: Page): Promise<Locator | undefined> {
  const buttons = page.locator('button')
  const candidates = await buttons.evaluateAll((elements: HTMLButtonElement[]) => {
    return elements.map((element, index) => {
      const rect = element.getBoundingClientRect()
      const visible = !!(rect.width || rect.height || element.getClientRects().length)
      const scopeText = [
        element.parentElement?.innerText,
        element.parentElement?.parentElement?.innerText,
        element.closest('[data-slot="card"]')?.textContent
      ].filter(Boolean).join('\n')
      return {
        index,
        disabled: element.disabled,
        text: (element.innerText || element.getAttribute('aria-label') || '').trim(),
        visible,
        scopeText
      }
    })
  })

  const candidate = candidates.find(item => {
    return item.visible
      && !item.disabled
      && item.text.length === 0
      && /Quantity/i.test(item.scopeText)
      && /How many eSIMs do you need\?/i.test(item.scopeText)
  })
  return candidate ? buttons.nth(candidate.index) : undefined
}

async function captureCheckoutReady(page: Page, options: SuperalinkPurchaseOptions, log: Logger): Promise<string | undefined> {
  try {
    await mkdir(options.screenshotDir, { recursive: true })
    const file = join(options.screenshotDir, `superalink-checkout-ready-${Date.now()}.png`)
    await page.screenshot({ path: file, fullPage: true })
    log.info(`[调试] 已保存付款前截图: ${file}`)
    return file
  } catch (error) {
    log.warn(`[调试] 保存付款前截图失败: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

async function readOrderSummary(page: Page): Promise<string> {
  const text = await page.locator('body').innerText().catch(() => '')
  return text.split('\n').map(item => item.trim()).filter(Boolean).slice(0, 80).join('\n')
}

function assertCheckoutDiscountApplied(orderSummaryText: string, options: SuperalinkPurchaseOptions, log: Logger): void {
  const normalizedText = orderSummaryText.replace(/\s+/g, ' ').trim()
  const couponPattern = new RegExp(`Coupon\\s+${escapeRegExp(options.affiliateCode)}(?:\\s|$)`, 'i')
  if (!couponPattern.test(normalizedText)) {
    throw new Error(`优惠校验失败，checkout 摘要没有显示 Coupon ${options.affiliateCode}，已在支付前停止`)
  }
  log.info(`[优惠] checkout 已确认 Coupon ${options.affiliateCode} 生效`)
}

function assertCheckoutCurrencyApplied(orderSummaryText: string, options: SuperalinkPurchaseOptions, log: Logger): void {
  if (options.currency !== 'THB') return
  if (!orderSummaryText.includes('฿')) {
    throw new Error('币种校验失败，checkout 摘要没有显示泰铢符号 ฿，已在支付前停止')
  }
  log.info('[付款] checkout 已确认使用 THB 泰铢')
}

async function waitForLoadRelaxed(page: Page, timeoutMs: number, log: Logger, description: string): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 15000) }).catch(() => {
    log.debug(`[页面] ${description} networkidle 等待超时，继续使用可见元素判断`)
  })
}

async function waitForCheckoutOrder(
  getOrder: () => CheckoutOrder | undefined,
  timeoutMs: number,
  log: Logger
): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < Math.min(timeoutMs, 30000)) {
    if (getOrder()?.uniqueId) return
    await sleep(500)
  }
  log.warn('[Superalink] 未在产品页捕获 checkout 订单，后续将以页面跳转结果为准')
}

async function clickFirstVisible(locator: Locator, timeoutMs: number, description: string): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const count = await locator.count()
    for (let index = 0; index < count; index++) {
      const item = locator.nth(index)
      if (await item.isVisible({ timeout: 200 }).catch(() => false)) {
        await item.scrollIntoViewIfNeeded().catch(() => undefined)
        await item.click()
        return
      }
    }
    await sleep(500)
  }
  throw new Error(`未找到可点击按钮: ${description}`)
}

function extractCheckoutOrderId(checkoutUrl: string): string | undefined {
  const match = checkoutUrl.match(/\/checkout\/([^/?#]+)/i)
  return match?.[1]
}

function normalizeUrl(value: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(value)) return value
  return new URL(value, baseUrl).toString()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
