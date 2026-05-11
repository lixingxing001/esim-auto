import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomLowercase(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let value = ''
  for (let i = 0; i < length; i++) {
    value += chars[Math.floor(Math.random() * chars.length)]
  }
  return value
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
