import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'
import type { Logger } from '../core/logger'
import { sleep } from '../core/utils'
import type { SuperalinkRegisterOptions, SuperalinkRegisterResult } from './types'

type FillTarget = {
  description: string
  selectors: string[]
  value: string
  required?: boolean
}

export async function submitSuperalinkInitialRegisterForm(
  options: SuperalinkRegisterOptions,
  log: Logger
): Promise<{ browser: Browser; page: Page }> {
  log.step('启动浏览器')
  const browser = await chromium.launch({
    headless: options.headless,
    proxy: options.proxyUrl ? { server: options.proxyUrl } : undefined
  })

  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    locale: 'en-US',
    timezoneId: 'Asia/Singapore'
  })
  await context.addCookies([
    {
      name: 'NEXT_LOCALE',
      value: options.locale,
      domain: 'www.superalink.com',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30
    },
    {
      name: 'is_locale_checked',
      value: 'true',
      domain: 'www.superalink.com',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 7
    }
  ])
  const page = await context.newPage()
  page.setDefaultTimeout(options.timeoutMs)

  page.on('console', message => {
    if (message.type() === 'error') log.debug(`[浏览器控制台] ${message.text()}`)
  })
  page.on('pageerror', error => {
    log.debug(`[页面异常] ${error.message}`)
  })

  const registerUrl = `${options.baseUrl}/${options.locale}/register`
  log.step(`打开注册页 ${registerUrl}`)
  await page.goto(registerUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
  await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => {
    log.debug('[页面] networkidle 等待超时，继续使用可见元素判断')
  })

  await acceptCookieIfPresent(page, log)

  await fillFirstVisible(page, log, {
    description: '名字',
    value: options.firstName,
    selectors: [
      'input[name="First name"]',
      'input[placeholder="First name"]',
      'input[type="text"]'
    ],
    required: true
  })

  if (options.lastName) {
    await fillFirstVisible(page, log, {
      description: '姓氏',
      value: options.lastName,
      selectors: [
        'input[name="Last name (optional)"]',
        'input[placeholder="Last name (optional)"]',
        'input[type="text"] >> nth=1'
      ]
    })
  }

  await fillFirstVisible(page, log, {
    description: '邮箱',
    value: options.email,
    selectors: [
      'input[name="Email"]',
      'input[placeholder="Email"]',
      'input[type="email"]',
      'input[type="text"] >> nth=2'
    ],
    required: true
  })

  log.step('提交注册表单')
  const continueButton = page.getByRole('button', { name: /^Continue$/i }).first()
  await continueButton.waitFor({ state: 'visible', timeout: options.timeoutMs })
  await continueButton.click()

  await Promise.race([
    page.waitForURL(url => url.toString().includes('/registration-confirmed'), { timeout: options.timeoutMs }),
    waitForVisibleText(page, [/email already registered/i, /failed to check email/i, /invalid email format/i], options.timeoutMs)
  ]).catch(error => {
    throw new Error(`提交注册表单后未进入确认页: ${error instanceof Error ? error.message : String(error)}`)
  })

  const currentUrl = page.url()
  if (!currentUrl.includes('/registration-confirmed')) {
    const bodyText = await page.locator('body').innerText().catch(() => '')
    throw new Error(`注册表单提交失败，当前页面: ${currentUrl}，页面文本: ${bodyText.slice(0, 300)}`)
  }

  log.info('[Superalink] 注册邮件已触发，等待邮箱收信')
  return { browser, page }
}

export async function finishSuperalinkPasswordCreation(
  browser: Browser,
  page: Page,
  options: SuperalinkRegisterOptions,
  link: { url?: string; token?: string },
  log: Logger
): Promise<SuperalinkRegisterResult> {
  const createPasswordUrl = normalizeCreatePasswordUrl(options, link)
  log.step(`打开创建密码页 ${createPasswordUrl}`)
  await page.goto(createPasswordUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
  await page.waitForLoadState('networkidle', { timeout: options.timeoutMs }).catch(() => {
    log.debug('[页面] 创建密码页 networkidle 等待超时，继续使用密码框判断')
  })

  const passwordInputs = page.locator('input[type="password"]')
  await passwordInputs.first().waitFor({ state: 'visible', timeout: options.timeoutMs })
  const count = await passwordInputs.count()
  if (count < 2) {
    throw new Error(`创建密码页密码框数量异常: ${count}`)
  }

  log.step('填写密码')
  await passwordInputs.nth(0).fill(options.password)
  await passwordInputs.nth(1).fill(options.password)

  log.step('提交创建账号')
  const createButton = page.getByRole('button', { name: /Create Account/i }).first()
  await createButton.waitFor({ state: 'visible', timeout: options.timeoutMs })
  await createButton.click()

  await Promise.race([
    page.waitForURL(url => url.toString().includes('/registration-success'), { timeout: options.timeoutMs }),
    waitForVisibleText(page, [/Welcome to Superalink/i, /successfully created/i, /Register failed/i], options.timeoutMs)
  ]).catch(error => {
    throw new Error(`提交密码后未进入成功页: ${error instanceof Error ? error.message : String(error)}`)
  })

  const finalUrl = page.url()
  const bodyText = await page.locator('body').innerText().catch(() => '')
  if (!finalUrl.includes('/registration-success') && !/successfully created|welcome to superalink/i.test(bodyText)) {
    throw new Error(`创建密码失败，当前页面: ${finalUrl}，页面文本: ${bodyText.slice(0, 300)}`)
  }

  await browser.close()
  log.info('[Superalink] 注册流程完成')

  return {
    success: true,
    email: options.email,
    password: options.password,
    firstName: options.firstName,
    lastName: options.lastName,
    createPasswordUrl,
    token: link.token,
    finalUrl
  }
}

export async function captureFailure(page: Page | undefined, options: SuperalinkRegisterOptions, log: Logger): Promise<void> {
  if (!page) return
  try {
    await mkdir(options.screenshotDir, { recursive: true })
    const file = join(options.screenshotDir, `superalink-failure-${Date.now()}.png`)
    await page.screenshot({ path: file, fullPage: true })
    log.warn(`[调试] 已保存失败截图: ${file}`)
  } catch (error) {
    log.warn(`[调试] 保存失败截图失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function normalizeCreatePasswordUrl(options: SuperalinkRegisterOptions, link: { url?: string; token?: string }): string {
  if (link.url) return link.url
  if (!link.token) {
    throw new Error('缺少创建密码链接和 token')
  }
  return `${options.baseUrl}/${options.locale}/create-password?token=${encodeURIComponent(link.token)}`
}

async function fillFirstVisible(page: Page, log: Logger, target: FillTarget): Promise<boolean> {
  for (const selector of target.selectors) {
    try {
      const locator = selector.includes('>> nth=')
        ? page.locator(selector)
        : page.locator(selector).first()
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.fill(target.value)
      log.info(`[页面] 已填写${target.description}`)
      return true
    } catch (error) {
      log.debug(`[页面] 选择器未命中 ${target.description}: ${selector} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (target.required) {
    throw new Error(`未找到${target.description}输入框`)
  }
  return false
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

async function waitForVisibleText(page: Page, patterns: RegExp[], timeoutMs: number): Promise<void> {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const text = await page.locator('body').innerText().catch(() => '')
    if (patterns.some(pattern => pattern.test(text))) return
    await sleep(500)
  }
  throw new Error('等待页面文本超时')
}
