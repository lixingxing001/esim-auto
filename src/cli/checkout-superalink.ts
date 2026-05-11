import { createLogger } from '../core/logger'
import { startSuperalinkCheckoutWebServer, type CheckoutWebServerOptions } from '../superalink/checkout-web'
import type { MailProviderName } from '../mail'

type CliOptions = Partial<CheckoutWebServerOptions> & {
  debug: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(name)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const has = (name: string): boolean => argv.includes(name)

  return {
    host: get('--host') || process.env.SUPERALINK_CHECKOUT_HOST || '127.0.0.1',
    port: Number.parseInt(get('--port') || process.env.SUPERALINK_CHECKOUT_PORT || '', 10) || 53333,
    baseUrl: (get('--baseUrl') || process.env.SUPERALINK_BASE_URL || 'https://www.superalink.com').replace(/\/+$/g, ''),
    affiliateCode: get('--affiliateCode') || get('--affCode') || process.env.SUPERALINK_AFFILIATE_CODE || 'FRONT0000',
    coupon: get('--coupon') || process.env.SUPERALINK_COUPON || get('--affiliateCode') || get('--affCode') || 'FRONT0000',
    defaultCountryCode: (get('--countryCode') || get('--country') || process.env.SUPERALINK_DEFAULT_COUNTRY || 'CN').toUpperCase(),
    defaultCurrency: (get('--currency') || process.env.SUPERALINK_DEFAULT_CURRENCY || 'THB').toUpperCase(),
    defaultQuantity: Number.parseInt(get('--quantity') || get('--qty') || process.env.SUPERALINK_DEFAULT_QUANTITY || '', 10) || 1,
    mailProvider: (get('--mailProvider') || get('--provider') || process.env.MAIL_PROVIDER || 'auto') as MailProviderName,
    mailWaitMs: (Number.parseInt(get('--mailWaitMin') || process.env.SUPERALINK_MAIL_WAIT_MIN || '', 10) || 10) * 60 * 1000,
    intervalMs: Number.parseInt(get('--intervalMs') || process.env.SUPERALINK_MAIL_INTERVAL_MS || '', 10) || 5000,
    outputPath: get('--output') || process.env.SUPERALINK_CHECKOUT_OUTPUT || 'output/superalink-web-purchases.json',
    paypalClientId: get('--paypalClientId') || process.env.SUPERALINK_PAYPAL_CLIENT_ID,
    debug: has('--debug') || process.env.DEBUG === '1'
  }
}

function validateOptions(options: CliOptions): void {
  if (!options.host) throw new Error('缺少 host')
  if (!Number.isInteger(options.port) || Number(options.port) < 1 || Number(options.port) > 65535) {
    throw new Error(`监听端口不合法: ${options.port}`)
  }
  if (!/^[A-Z0-9_]{2,12}$/.test(options.defaultCountryCode ?? '')) {
    throw new Error(`默认国家或区域代码不合法: ${options.defaultCountryCode}`)
  }
  if (!/^[A-Z]{3}$/.test(options.defaultCurrency ?? '')) {
    throw new Error(`默认币种不合法: ${options.defaultCurrency}`)
  }
  if (!Number.isInteger(options.defaultQuantity) || Number(options.defaultQuantity) < 1 || Number(options.defaultQuantity) > 20) {
    throw new Error(`默认数量不合法: ${options.defaultQuantity}`)
  }
  if (!['auto', '215im', 'tempmail-lol', '1secmail'].includes(options.mailProvider ?? '')) {
    throw new Error(`邮箱供应商不支持: ${options.mailProvider}`)
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  validateOptions(options)
  const log = createLogger({ debug: options.debug })
  const { server } = await startSuperalinkCheckoutWebServer(options, log)
  process.on('SIGINT', () => {
    log.warn('[Web] 收到 SIGINT，正在退出')
    server.close(() => process.exit(0))
  })
  await new Promise<void>(resolve => {
    server.once('close', resolve)
  })
}

main().catch(error => {
  process.stderr.write(`[FATAL] ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
