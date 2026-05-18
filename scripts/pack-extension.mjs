import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

const sourceDir = 'extension'
const outputPath = 'output/superalink-esim-extension.zip'

const crcTable = new Uint32Array(256)
for (let i = 0; i < crcTable.length; i++) {
  let value = i
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  crcTable[i] = value >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980)
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

function localHeader(name, data, checksum, timestamp) {
  const nameBuffer = Buffer.from(name)
  const header = Buffer.alloc(30 + nameBuffer.length)
  header.writeUInt32LE(0x04034b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(0x0800, 6)
  header.writeUInt16LE(0, 8)
  header.writeUInt16LE(timestamp.time, 10)
  header.writeUInt16LE(timestamp.day, 12)
  header.writeUInt32LE(checksum, 14)
  header.writeUInt32LE(data.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(nameBuffer.length, 26)
  header.writeUInt16LE(0, 28)
  nameBuffer.copy(header, 30)
  return header
}

function centralHeader(name, data, checksum, offset, timestamp) {
  const nameBuffer = Buffer.from(name)
  const header = Buffer.alloc(46 + nameBuffer.length)
  header.writeUInt32LE(0x02014b50, 0)
  header.writeUInt16LE(20, 4)
  header.writeUInt16LE(20, 6)
  header.writeUInt16LE(0x0800, 8)
  header.writeUInt16LE(0, 10)
  header.writeUInt16LE(timestamp.time, 12)
  header.writeUInt16LE(timestamp.day, 14)
  header.writeUInt32LE(checksum, 16)
  header.writeUInt32LE(data.length, 20)
  header.writeUInt32LE(data.length, 24)
  header.writeUInt16LE(nameBuffer.length, 28)
  header.writeUInt16LE(0, 30)
  header.writeUInt16LE(0, 32)
  header.writeUInt16LE(0, 34)
  header.writeUInt16LE(0, 36)
  header.writeUInt32LE(0, 38)
  header.writeUInt32LE(offset, 42)
  nameBuffer.copy(header, 46)
  return header
}

function endRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22)
  record.writeUInt32LE(0x06054b50, 0)
  record.writeUInt16LE(0, 4)
  record.writeUInt16LE(0, 6)
  record.writeUInt16LE(entryCount, 8)
  record.writeUInt16LE(entryCount, 10)
  record.writeUInt32LE(centralSize, 12)
  record.writeUInt32LE(centralOffset, 16)
  record.writeUInt16LE(0, 20)
  return record
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
  return files.sort((left, right) => left.localeCompare(right))
}

async function main() {
  const files = await listFiles(sourceDir)
  const fileParts = []
  const centralParts = []
  const timestamp = dosTimestamp()
  let offset = 0

  for (const file of files) {
    const name = relative(sourceDir, file).split('\\').join('/')
    const data = await readFile(file)
    const checksum = crc32(data)
    const header = localHeader(name, data, checksum, timestamp)
    fileParts.push(header, data)
    centralParts.push(centralHeader(name, data, checksum, offset, timestamp))
    offset += header.length + data.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0)
  const archive = Buffer.concat([
    ...fileParts,
    ...centralParts,
    endRecord(files.length, centralSize, centralOffset)
  ])

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, archive)
  console.log(`packed ${files.length} files -> ${outputPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
