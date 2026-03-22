import { describe, it, expect } from 'vitest'
import { msg, conversation, convertMessage, detectMimeFromBuffer, detectMimeFromExtension, detectMimeFromDataUrl } from '../index.js'

// --- Basic text rendering ---
describe('msg() text-only', () => {
  it('forOpenAI returns string content for single text part', () => {
    const result = msg('user').text('hello').forOpenAI()
    expect(result).toEqual({ role: 'user', content: 'hello' })
  })

  it('forAnthropic returns string content for single text part', () => {
    const result = msg('user').text('hi').forAnthropic()
    expect(result).toEqual({ role: 'user', content: 'hi' })
  })

  it('forGemini returns parts array', () => {
    const result = msg('user').text('hi').forGemini()
    expect(result).toEqual({ role: 'user', parts: [{ text: 'hi' }] })
  })

  it('assistant role maps to model in Gemini', () => {
    const result = msg('assistant').text('reply').forGemini()
    expect(result.role).toBe('model')
  })

  it('system role maps to user in Anthropic', () => {
    const result = msg('system').text('be helpful').forAnthropic()
    expect(result.role).toBe('user')
  })

  it('multi-text parts are joined for OpenAI', () => {
    const result = msg('user').text('Hello').text(' World').forOpenAI()
    expect(result.content).toBe('Hello World')
  })

  it('for() dispatches correctly', () => {
    expect(msg('user').text('x').for('openai')).toEqual({ role: 'user', content: 'x' })
    expect(msg('user').text('x').for('anthropic')).toEqual({ role: 'user', content: 'x' })
    expect(msg('user').text('x').for('gemini')).toEqual({ role: 'user', parts: [{ text: 'x' }] })
  })
})

// --- Image from Buffer ---
describe('msg() image from Buffer', () => {
  it('base64-encodes a PNG buffer correctly in OpenAI format', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const result = msg('user').image(pngHeader).forOpenAI()
    expect(result.content).toBeInstanceOf(Array)
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('image_url')
    const imageUrl = block['image_url'] as Record<string, unknown>
    expect(typeof imageUrl['url']).toBe('string')
    expect((imageUrl['url'] as string).startsWith('data:image/png;base64,')).toBe(true)
  })

  it('base64-encodes a JPEG buffer correctly in Anthropic format', () => {
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10])
    const result = msg('user').image(jpegHeader).forAnthropic()
    expect(result.content).toBeInstanceOf(Array)
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('image')
    const source = block['source'] as Record<string, unknown>
    expect(source['type']).toBe('base64')
    expect(source['media_type']).toBe('image/jpeg')
  })

  it('base64-encodes a PNG buffer correctly in Gemini format', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const result = msg('user').image(pngHeader).forGemini()
    const part = result.parts[0] as Record<string, unknown>
    const inlineData = part['inlineData'] as Record<string, unknown>
    expect(inlineData['mimeType']).toBe('image/png')
    expect(typeof inlineData['data']).toBe('string')
  })

  it('throws when buffer MIME cannot be determined and no mimeType provided', () => {
    const unknownBuf = Buffer.from([0x00, 0x01, 0x02, 0x03])
    expect(() => msg('user').image(unknownBuf)).toThrow()
  })

  it('uses options.mimeType override for buffer', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02])
    const result = msg('user').image(buf, { mimeType: 'image/webp' }).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    const imageUrl = block['image_url'] as Record<string, unknown>
    expect((imageUrl['url'] as string).startsWith('data:image/webp;base64,')).toBe(true)
  })
})

// --- Image from URL string ---
describe('msg() image from URL', () => {
  it('uses image_url with url in OpenAI format', () => {
    const url = 'https://example.com/photo.jpg'
    const result = msg('user').image(url).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('image_url')
    const imageUrl = block['image_url'] as Record<string, unknown>
    expect(imageUrl['url']).toBe(url)
  })

  it('uses source.type=url in Anthropic format', () => {
    const url = 'https://example.com/photo.jpg'
    const result = msg('user').image(url).forAnthropic()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    const source = block['source'] as Record<string, unknown>
    expect(source['type']).toBe('url')
    expect(source['url']).toBe(url)
  })

  it('uses fileData in Gemini format', () => {
    const url = 'https://example.com/photo.jpg'
    const result = msg('user').image(url).forGemini()
    const part = result.parts[0] as Record<string, unknown>
    expect(part['fileData']).toBeDefined()
    const fileData = part['fileData'] as Record<string, unknown>
    expect(fileData['fileUri']).toBe(url)
  })

  it('applies detail option in OpenAI format', () => {
    const url = 'https://example.com/photo.jpg'
    const result = msg('user').image(url, { detail: 'high' }).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    const imageUrl = block['image_url'] as Record<string, unknown>
    expect(imageUrl['detail']).toBe('high')
  })
})

// --- Image from data URL ---
describe('msg() image from data URL', () => {
  it('parses data URL correctly', () => {
    const dataUrl = 'data:image/gif;base64,R0lGODlh'
    const result = msg('user').image(dataUrl).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    const imageUrl = block['image_url'] as Record<string, unknown>
    expect((imageUrl['url'] as string).startsWith('data:image/gif;base64,')).toBe(true)
  })
})

// --- Audio ---
describe('msg() audio', () => {
  it('renders audio as input_audio in OpenAI format', () => {
    const buf = Buffer.from('audio-data')
    const result = msg('user').audio(buf, { mimeType: 'audio/mp3', format: 'mp3' }).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('input_audio')
    const inputAudio = block['input_audio'] as Record<string, unknown>
    expect(inputAudio['format']).toBe('mp3')
  })

  it('renders audio as unsupported text in Anthropic format', () => {
    const buf = Buffer.from('audio-data')
    const result = msg('user').audio(buf, { mimeType: 'audio/wav', format: 'wav' }).forAnthropic()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('text')
    expect(block['text'] as string).toContain('Audio not supported')
  })

  it('renders audio as inlineData in Gemini format', () => {
    const buf = Buffer.from('audio-data')
    const result = msg('user').audio(buf, { mimeType: 'audio/wav', format: 'wav' }).forGemini()
    const part = result.parts[0] as Record<string, unknown>
    expect(part['inlineData']).toBeDefined()
  })
})

// --- Document ---
describe('msg() document', () => {
  it('renders document as fallback text in OpenAI format', () => {
    const buf = Buffer.from('%PDF-1.4 content')
    const result = msg('user').document(buf, { mimeType: 'application/pdf', filename: 'report.pdf' }).forOpenAI()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('text')
    expect(block['text'] as string).toContain('Document')
  })

  it('renders document as base64 source in Anthropic format', () => {
    const buf = Buffer.from('%PDF-1.4 content')
    const result = msg('user').document(buf, { mimeType: 'application/pdf' }).forAnthropic()
    const block = (result.content as Array<Record<string, unknown>>)[0]
    expect(block['type']).toBe('document')
    const source = block['source'] as Record<string, unknown>
    expect(source['type']).toBe('base64')
    expect(source['media_type']).toBe('application/pdf')
  })

  it('renders document as inlineData in Gemini format', () => {
    const buf = Buffer.from('%PDF-1.4 content')
    const result = msg('user').document(buf, { mimeType: 'application/pdf' }).forGemini()
    const part = result.parts[0] as Record<string, unknown>
    expect(part['inlineData']).toBeDefined()
    const inlineData = part['inlineData'] as Record<string, unknown>
    expect(inlineData['mimeType']).toBe('application/pdf')
  })
})

// --- Multi-part messages ---
describe('msg() multi-part', () => {
  it('produces array content when text and image are combined in OpenAI', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const result = msg('user').text('what is this?').image(pngHeader).forOpenAI()
    expect(result.content).toBeInstanceOf(Array)
    const blocks = result.content as Array<Record<string, unknown>>
    expect(blocks).toHaveLength(2)
    expect(blocks[0]['type']).toBe('text')
    expect(blocks[1]['type']).toBe('image_url')
  })

  it('produces array content in Anthropic for text + image', () => {
    const url = 'https://example.com/img.png'
    const result = msg('user').text('describe').image(url).forAnthropic()
    const blocks = result.content as Array<Record<string, unknown>>
    expect(blocks).toHaveLength(2)
    expect(blocks[0]['type']).toBe('text')
    expect(blocks[1]['type']).toBe('image')
  })
})

// --- toJSON ---
describe('msg() toJSON', () => {
  it('returns InternalMessage correctly', () => {
    const internal = msg('user').text('hello').toJSON()
    expect(internal.role).toBe('user')
    expect(internal.parts).toHaveLength(1)
    expect(internal.parts[0]).toEqual({ type: 'text', text: 'hello' })
  })
})

// --- conversation() builder ---
describe('conversation() builder', () => {
  it('forOpenAI includes system as first message', () => {
    const result = conversation()
      .system('be helpful')
      .user('hello')
      .forOpenAI()
    expect(result.messages[0]).toEqual({ role: 'system', content: 'be helpful' })
    expect(result.messages[1]).toEqual({ role: 'user', content: 'hello' })
  })

  it('forAnthropic extracts system as top-level field', () => {
    const result = conversation()
      .system('you are a bot')
      .user('hello')
      .forAnthropic()
    expect(result.system).toBe('you are a bot')
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toEqual({ role: 'user', content: 'hello' })
  })

  it('forGemini extracts system as systemInstruction', () => {
    const result = conversation()
      .system('be helpful')
      .user('hello')
      .forGemini()
    expect(result.systemInstruction).toEqual({ parts: [{ text: 'be helpful' }] })
    expect(result.contents).toHaveLength(1)
    expect(result.contents[0]).toEqual({ role: 'user', parts: [{ text: 'hello' }] })
  })

  it('assistant role maps to model in Gemini conversation', () => {
    const result = conversation()
      .user('hi')
      .assistant('hello back')
      .forGemini()
    expect(result.contents[1].role).toBe('model')
  })

  it('accepts MessageBuilder for user turn', () => {
    const userMsg = msg('user').text('built message')
    const result = conversation().user(userMsg).forOpenAI()
    expect(result.messages[0]).toEqual({ role: 'user', content: 'built message' })
  })

  it('forOpenAI without system omits system message', () => {
    const result = conversation().user('hi').forOpenAI()
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].role).toBe('user')
  })

  it('forAnthropic without system omits system field', () => {
    const result = conversation().user('hi').forAnthropic()
    expect(result.system).toBeUndefined()
  })

  it('conversation().for() dispatches to correct provider', () => {
    const c = conversation().system('sys').user('hi')
    const oai = c.for('openai') as { messages: unknown[] }
    const ant = c.for('anthropic') as { system: string }
    const gem = c.for('gemini') as { systemInstruction: unknown }
    expect(oai.messages).toHaveLength(2)
    expect(ant.system).toBe('sys')
    expect(gem.systemInstruction).toBeDefined()
  })

  it('toJSON returns InternalConversation', () => {
    const internal = conversation().system('s').user('u').toJSON()
    expect(internal.system).toBe('s')
    expect(internal.messages).toHaveLength(1)
  })
})

// --- convertMessage ---
describe('convertMessage()', () => {
  it('converts OpenAI text message to Anthropic', () => {
    const openaiMsg = { role: 'user' as const, content: 'hello' }
    const result = convertMessage(openaiMsg, 'openai', 'anthropic')
    expect(result).toEqual({ role: 'user', content: 'hello' })
  })

  it('converts Anthropic text message to OpenAI', () => {
    const anthropicMsg = { role: 'user' as const, content: 'hi there' }
    const result = convertMessage(anthropicMsg, 'anthropic', 'openai')
    expect(result).toEqual({ role: 'user', content: 'hi there' })
  })

  it('converts OpenAI text message to Gemini', () => {
    const openaiMsg = { role: 'user' as const, content: 'hi' }
    const result = convertMessage(openaiMsg, 'openai', 'gemini') as { role: string; parts: unknown[] }
    expect(result.role).toBe('user')
    expect(result.parts).toEqual([{ text: 'hi' }])
  })

  it('converts Gemini content to OpenAI', () => {
    const geminiMsg = { role: 'user' as const, parts: [{ text: 'hello gemini' }] }
    const result = convertMessage(geminiMsg, 'gemini', 'openai') as { role: string; content: string }
    expect(result.role).toBe('user')
    expect(result.content).toBe('hello gemini')
  })

  it('converts OpenAI image_url (base64) to Anthropic', () => {
    const openaiMsg = {
      role: 'user' as const,
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
      ] as Array<Record<string, unknown>>,
    }
    const result = convertMessage(openaiMsg, 'openai', 'anthropic') as { content: Array<Record<string, unknown>> }
    const block = result.content[0]
    expect(block['type']).toBe('image')
    const source = block['source'] as Record<string, unknown>
    expect(source['type']).toBe('base64')
    expect(source['media_type']).toBe('image/png')
  })

  it('converts OpenAI image_url (http URL) to Anthropic', () => {
    const openaiMsg = {
      role: 'user' as const,
      content: [
        { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
      ] as Array<Record<string, unknown>>,
    }
    const result = convertMessage(openaiMsg, 'openai', 'anthropic') as { content: Array<Record<string, unknown>> }
    const block = result.content[0]
    const source = block['source'] as Record<string, unknown>
    expect(source['type']).toBe('url')
  })

  it('converts Anthropic base64 image to Gemini', () => {
    const anthropicMsg = {
      role: 'user' as const,
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' },
        },
      ] as Array<Record<string, unknown>>,
    }
    const result = convertMessage(anthropicMsg, 'anthropic', 'gemini') as { parts: Array<Record<string, unknown>> }
    const part = result.parts[0]
    expect(part['inlineData']).toBeDefined()
  })
})

// --- MIME detection ---
describe('MIME detection', () => {
  it('detects PNG from buffer magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    expect(detectMimeFromBuffer(buf)).toBe('image/png')
  })

  it('detects JPEG from buffer magic bytes', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
    expect(detectMimeFromBuffer(buf)).toBe('image/jpeg')
  })

  it('detects PDF from buffer magic bytes', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D])
    expect(detectMimeFromBuffer(buf)).toBe('application/pdf')
  })

  it('returns null for unknown buffer', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03])
    expect(detectMimeFromBuffer(buf)).toBeNull()
  })

  it('detects MIME from extension', () => {
    expect(detectMimeFromExtension('photo.jpg')).toBe('image/jpeg')
    expect(detectMimeFromExtension('sound.wav')).toBe('audio/wav')
    expect(detectMimeFromExtension('doc.pdf')).toBe('application/pdf')
    expect(detectMimeFromExtension('file.txt')).toBe('text/plain')
  })

  it('returns null for unknown extension', () => {
    expect(detectMimeFromExtension('file.xyz')).toBeNull()
  })

  it('parses MIME from data URL', () => {
    expect(detectMimeFromDataUrl('data:image/jpeg;base64,abc')).toBe('image/jpeg')
    expect(detectMimeFromDataUrl('data:audio/wav;base64,xyz')).toBe('audio/wav')
    expect(detectMimeFromDataUrl('not-a-data-url')).toBeNull()
  })
})
