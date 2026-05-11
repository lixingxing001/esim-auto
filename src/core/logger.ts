export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type Logger = {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  step(message: string): void
}

export type LoggerOptions = {
  /** 是否输出调试日志，用于定位页面选择器和邮件轮询状态。 */
  debug?: boolean
}

const levelPrefix: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
}

function nowText(): string {
  return new Date().toISOString()
}

function write(level: LogLevel, message: string): void {
  const line = `[${nowText()}] [${levelPrefix[level]}] ${message}`
  const output = level === 'error' ? process.stderr : process.stdout
  output.write(`${line}\n`)
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return {
    debug(message: string) {
      if (options.debug) write('debug', message)
    },
    info(message: string) {
      write('info', message)
    },
    warn(message: string) {
      write('warn', message)
    },
    error(message: string) {
      write('error', message)
    },
    step(message: string) {
      write('info', `========== ${message} ==========`)
    }
  }
}
