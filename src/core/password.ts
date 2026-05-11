import { randomBytes } from 'node:crypto'

export type PasswordValidation = {
  /** 是否同时包含大小写字母。 */
  lowerUpper: boolean
  /** 是否同时包含数字和符号。 */
  numberAndSymbol: boolean
  /** 是否满足 Superalink 前端要求的最小长度。 */
  length: boolean
  /** 是否满足全部密码规则。 */
  valid: boolean
}

const SYMBOLS = '_!?><@#$%^&*()'

export function validateSuperalinkPassword(password: string): PasswordValidation {
  const lowerUpper = /^(?=.*[a-z])(?=.*[A-Z])/.test(password)
  const numberAndSymbol = new RegExp(`^(?=.*\\d)(?=.*[${SYMBOLS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}])`).test(password)
  const length = password.length >= 6
  return {
    lowerUpper,
    numberAndSymbol,
    length,
    valid: lowerUpper && numberAndSymbol && length
  }
}

export function generateSuperalinkPassword(): string {
  // 固定包含大小写、数字和符号，剩余部分使用随机字节，避免生成不满足前端校验的密码。
  const randomPart = randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  return `Aa1!${randomPart}`
}
