import type { ContentSource } from './types.js'

const MIME_MAP: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  // Documents
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
}

const MAGIC_BYTES: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
]

export function detectMimeFromBuffer(buf: Buffer): string | null {
  for (const entry of MAGIC_BYTES) {
    const { bytes, mime } = entry
    if (buf.length < bytes.length) continue
    let match = true
    for (let i = 0; i < bytes.length; i++) {
      if (buf[i] !== bytes[i]) { match = false; break }
    }
    if (match) {
      // RIFF header matches both WAV and WEBP — check bytes 8-11 for WEBP
      if (mime === 'image/webp' && buf.length >= 12) {
        const webpSig = [0x57, 0x45, 0x42, 0x50] // "WEBP"
        let isWebp = true
        for (let i = 0; i < 4; i++) {
          if (buf[8 + i] !== webpSig[i]) { isWebp = false; break }
        }
        if (!isWebp) continue
      }
      return mime
    }
  }
  return null
}

export function detectMimeFromExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return null
  const ext = filename.slice(lastDot).toLowerCase()
  return MIME_MAP[ext] ?? null
}

export function detectMimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/)
  return match ? match[1] : null
}

export function resolveSource(
  source: ContentSource,
  options?: { mimeType?: string; filename?: string },
): { data: string; mimeType: string; sourceType: 'base64' | 'url' } {
  // Buffer or Uint8Array
  if (typeof source !== 'string') {
    const buf = Buffer.isBuffer(source) ? source : Buffer.from(source)
    const mimeType =
      options?.mimeType ??
      (options?.filename ? detectMimeFromExtension(options.filename) : null) ??
      detectMimeFromBuffer(buf)
    if (!mimeType) {
      throw new Error('Cannot determine MIME type from buffer. Provide options.mimeType.')
    }
    return { data: buf.toString('base64'), mimeType, sourceType: 'base64' }
  }

  // Data URL string: "data:image/jpeg;base64,..."
  if (source.startsWith('data:')) {
    const mimeType = options?.mimeType ?? detectMimeFromDataUrl(source)
    if (!mimeType) {
      throw new Error('Cannot parse MIME type from data URL.')
    }
    const commaIdx = source.indexOf(',')
    const data = commaIdx !== -1 ? source.slice(commaIdx + 1) : source
    return { data, mimeType, sourceType: 'base64' }
  }

  // URL string
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const mimeType =
      options?.mimeType ??
      (options?.filename ? detectMimeFromExtension(options.filename) : null) ??
      detectMimeFromExtension(source) ??
      'application/octet-stream'
    return { data: source, mimeType, sourceType: 'url' }
  }

  // Treat as raw base64 string
  const mimeType =
    options?.mimeType ??
    (options?.filename ? detectMimeFromExtension(options.filename) : null)
  if (!mimeType) {
    throw new Error(
      'Cannot determine MIME type from base64 string. Provide options.mimeType or options.filename.',
    )
  }
  return { data: source, mimeType, sourceType: 'base64' }
}
