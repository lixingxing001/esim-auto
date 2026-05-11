import type { SuperalinkEsimMailInfo } from '../mail/content'

export type SuperalinkRegisterOptions = {
  /** 注册页面语言路径，目前默认英文路径。 */
  locale: string
  /** 注册站点根地址。 */
  baseUrl: string
  /** 注册邮箱。 */
  email: string
  /** 名字，Superalink 前端要求至少 2 个字符。 */
  firstName: string
  /** 姓氏，可为空。 */
  lastName?: string
  /** 创建账号时设置的密码。 */
  password: string
  /** 是否使用无界面浏览器。 */
  headless: boolean
  /** 可选代理地址。 */
  proxyUrl?: string
  /** 页面操作超时时间。 */
  timeoutMs: number
  /** 调试失败时截图目录。 */
  screenshotDir: string
}

export type SuperalinkRegisterResult = {
  success: boolean
  email: string
  password: string
  firstName: string
  lastName?: string
  createPasswordUrl?: string
  token?: string
  finalUrl?: string
  error?: string
}

export type SuperalinkPurchaseOptions = {
  /** 页面语言路径，默认使用英文路径。 */
  locale: string
  /** Superalink 站点根地址。 */
  baseUrl: string
  /** Affiliate 入口地址，用来让官网写入折扣 Cookie。 */
  affiliateUrl: string
  /** Affiliate code，例如 FRONT0000。 */
  affiliateCode: string
  /** 目的地 slug，例如 china-mainland。 */
  countrySlug?: string
  /** 直接购买的产品页地址，传入后优先于 countrySlug。 */
  productUrl?: string
  /** 购买天数，官网可能按目的地最小天数自动修正。 */
  durationDays: number
  /** 套餐类型，常见值为 unlimited 或 quota。 */
  option: string
  /** 购买数量。 */
  quantity: number
  /** 支付货币，例如 USD。 */
  currency: string
  /** 接收 eSIM voucher 的邮箱。 */
  email: string
  /** 本地保存的账号密码，注册账号时会使用。 */
  password?: string
  /** 可选 WhatsApp 号码。 */
  whatsappNumber?: string
  /** 是否使用无界面浏览器。 */
  headless: boolean
  /** 可选代理地址。 */
  proxyUrl?: string
  /** 页面操作超时时间。 */
  timeoutMs: number
  /** 调试失败时截图目录。 */
  screenshotDir: string
  /** 可选 SKU 校验，用来防止买错套餐。 */
  expectedSku?: string
}

export type SuperalinkPurchaseResult = {
  success: boolean
  email: string
  password?: string
  affiliateCode: string
  productUrl: string
  checkoutUrl: string
  orderId?: string
  productSku?: string
  countryName?: string
  quantity: number
  currency: string
  orderSummaryText?: string
  readyForPayment: boolean
  paymentStoppedBeforePayNow: boolean
  paymentStatus?: 'ready_for_payment' | 'payment_detected' | 'payment_manual_continue' | 'payment_timeout'
  postPaymentUrl?: string
  postPaymentPageText?: string
  esimMailInfo?: SuperalinkEsimMailInfo[]
  screenshotPath?: string
  postPaymentScreenshotPath?: string
}
