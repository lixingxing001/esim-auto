export type SuperalinkMailLink = {
  /** 邮件里的完整创建密码链接。 */
  url?: string
  /** 从链接或正文里解析出来的发行令牌。 */
  token?: string
}

export type SuperalinkEsimMailInfo = {
  /** 邮件标题，便于人工核对是哪一封 eSIM 邮件。 */
  subject?: string
  /** 发件人，便于排查供应商误判。 */
  from?: string
  /** 邮件正文纯文本摘要。 */
  textPreview: string
  /** 邮件中提取出的 URL。 */
  urls: string[]
  /** 邮件中可能承载 QR 或 voucher 的图片地址。 */
  imageUrls: string[]
  /** 邮件里可能存在的手动安装码，例如 LPA 格式。 */
  manualActivationCodes: string[]
  /** 邮件里识别到的订单号。 */
  orderIds: string[]
}

const CODE_PATTERNS = [
  /(?:verification\s*code|otp|code is)[：:\s]*(\d{4,8})/gi,
  /^\s*(\d{4,8})\s*$/gm,
  />\s*(\d{4,8})\s*</g
]

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(Number.parseInt(n, 16)))
}

export function htmlToText(html: string): string {
  if (!html) return ''
  return decodeHtmlEntities(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractVerificationCode(text: string): string | null {
  if (!text) return null

  for (const pattern of CODE_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1]
      if (code && /^\d{4,8}$/.test(code)) return code
    }
  }

  return null
}

export function extractUrls(text: string): string[] {
  if (!text) return []
  const decoded = decodeHtmlEntities(text)
  const urls = decoded.match(/https?:\/\/[^\s"'<>]+/gi) ?? []
  return urls.map(url => url.replace(/[),.;]+$/g, ''))
}

export function extractSuperalinkCreatePasswordLink(content: string): SuperalinkMailLink | null {
  const decoded = decodeHtmlEntities(content)
  const urls = extractUrls(decoded)

  for (const rawUrl of urls) {
    try {
      const url = new URL(rawUrl)
      const normalizedPath = url.pathname.toLowerCase()
      const token = url.searchParams.get('token') || url.searchParams.get('issuance_token') || extractTokenFromPath(url.pathname)

      if (url.hostname.includes('superalink.com') && (normalizedPath.includes('create-password') || token)) {
        return { url: rawUrl, token: token ?? undefined }
      }
    } catch {
      continue
    }
  }

  const inlineToken = extractInlineIssuanceToken(decoded)
  return inlineToken ? { token: inlineToken } : null
}

export function extractSuperalinkEsimMailInfo(content: string, subject?: string, from?: string): SuperalinkEsimMailInfo | null {
  const decoded = decodeHtmlEntities(content)
  const text = htmlToText(decoded)
  const normalizedText = `${subject ?? ''}\n${from ?? ''}\n${text}`.toLowerCase()
  const looksLikeEsimMail = normalizedText.includes('superalink')
    && normalizedText.includes('esim')
    && /(voucher|qr|activation|install|order|purchase|payment|data plan)/i.test(normalizedText)

  if (!looksLikeEsimMail) return null

  const urls = uniqueStrings(extractUrls(decoded))
  const imageUrls = uniqueStrings(extractImageUrls(decoded))
  const manualActivationCodes = uniqueStrings(extractManualActivationCodes(decoded))
  const orderIds = uniqueStrings(extractOrderIds(decoded))

  return {
    subject,
    from,
    textPreview: text.slice(0, 2000),
    urls,
    imageUrls,
    manualActivationCodes,
    orderIds
  }
}

function extractTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/\/create-password\/([^/?#]+)/i)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

function extractInlineIssuanceToken(text: string): string | null {
  const patterns = [
    /[?&](?:token|issuance_token)=([^&\s"'<>]+)/i,
    /\bissuance_token["'\s:=]+([a-zA-Z0-9._-]+)/i,
    /\btoken["'\s:=]+([a-zA-Z0-9._-]{16,})/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return decodeURIComponent(match[1])
  }

  return null
}

function extractImageUrls(html: string): string[] {
  const urls: string[] = []
  const pattern = /<img[^>]+src=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) urls.push(match[1])
  }
  return urls.map(url => decodeHtmlEntities(url).replace(/[),.;]+$/g, ''))
}

function extractManualActivationCodes(text: string): string[] {
  const codes: string[] = []
  const patterns = [
    /\bLPA:1\$[^\s"'<> &]+/gi,
    /\bLPA\$[^\s"'<> &]+/gi,
    /\b(?:activation|manual|matching)\s*code[：:\s]+([A-Z0-9$._-]{8,})/gi
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      codes.push(match[1] ?? match[0])
    }
  }
  return codes
}

function extractOrderIds(text: string): string[] {
  const ids: string[] = []
  const patterns = [
    /\bsuperalink-\d+-[A-Z0-9_-]+/gi,
    /\border\s*(?:id|number|no)?[：:#\s-]+([A-Z0-9][A-Z0-9_-]{5,})/gi
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      ids.push(match[1] ?? match[0])
    }
  }
  return ids
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}
