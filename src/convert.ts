import type {
  ContentPart,
  InternalMessage,
  InternalConversation,
  Provider,
  OpenAIMessage,
  AnthropicMessage,
  GeminiContent,
  OpenAIConversation,
  AnthropicConversation,
  GeminiConversation,
} from './types.js'
import { renderMessageOpenAI } from './render-openai.js'
import { renderMessageAnthropic } from './render-anthropic.js'
import { renderMessageGemini } from './render-gemini.js'

// --- Parse from-format to InternalMessage ---

function parseOpenAIMessage(m: OpenAIMessage): InternalMessage {
  const role: 'user' | 'assistant' | 'system' = m.role === 'developer' ? 'system' : m.role
  if (typeof m.content === 'string') {
    return { role, parts: [{ type: 'text', text: m.content }] }
  }
  const parts: ContentPart[] = m.content.map((block) => {
    if (block['type'] === 'text') {
      return { type: 'text', text: String(block['text'] ?? '') }
    }
    if (block['type'] === 'image_url') {
      const imageUrl = block['image_url'] as Record<string, unknown> | undefined
      const url = String(imageUrl?.['url'] ?? '')
      const detail = imageUrl?.['detail'] as 'low' | 'high' | 'auto' | undefined
      if (url.startsWith('data:')) {
        const mimeMatch = url.match(/^data:([^;,]+)/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
        const commaIdx = url.indexOf(',')
        const data = commaIdx !== -1 ? url.slice(commaIdx + 1) : ''
        return { type: 'image', data, mimeType, sourceType: 'base64', ...(detail ? { detail } : {}) }
      }
      return { type: 'image', data: url, mimeType: 'image/jpeg', sourceType: 'url', url, ...(detail ? { detail } : {}) }
    }
    if (block['type'] === 'input_audio') {
      const audio = block['input_audio'] as Record<string, unknown> | undefined
      const data = String(audio?.['data'] ?? '')
      const format = String(audio?.['format'] ?? 'mp3')
      return { type: 'audio', data, mimeType: `audio/${format}`, format }
    }
    // Fallback
    return { type: 'text', text: JSON.stringify(block) }
  })
  return { role, parts }
}

function parseAnthropicMessage(m: AnthropicMessage): InternalMessage {
  const role = m.role
  if (typeof m.content === 'string') {
    return { role, parts: [{ type: 'text', text: m.content }] }
  }
  const parts: ContentPart[] = m.content.map((block) => {
    if (block['type'] === 'text') {
      return { type: 'text', text: String(block['text'] ?? '') }
    }
    if (block['type'] === 'image') {
      const source = block['source'] as Record<string, unknown> | undefined
      if (source?.['type'] === 'base64') {
        return {
          type: 'image',
          data: String(source['data'] ?? ''),
          mimeType: String(source['media_type'] ?? 'image/jpeg'),
          sourceType: 'base64',
        }
      }
      if (source?.['type'] === 'url') {
        const url = String(source['url'] ?? '')
        return { type: 'image', data: url, mimeType: 'image/jpeg', sourceType: 'url', url }
      }
    }
    if (block['type'] === 'document') {
      const source = block['source'] as Record<string, unknown> | undefined
      if (source?.['type'] === 'base64') {
        return {
          type: 'document',
          data: String(source['data'] ?? ''),
          mimeType: String(source['media_type'] ?? 'application/pdf'),
          sourceType: 'base64',
        }
      }
      if (source?.['type'] === 'url') {
        const url = String(source['url'] ?? '')
        return { type: 'document', data: url, mimeType: 'application/pdf', sourceType: 'url', url }
      }
    }
    return { type: 'text', text: JSON.stringify(block) }
  })
  return { role, parts }
}

function parseGeminiContent(c: GeminiContent): InternalMessage {
  const role: 'user' | 'assistant' = c.role === 'model' ? 'assistant' : 'user'
  const parts: ContentPart[] = c.parts.map((p) => {
    if ('text' in p) {
      return { type: 'text', text: String(p['text']) }
    }
    if ('inlineData' in p) {
      const inlineData = p['inlineData'] as Record<string, unknown>
      const mimeType = String(inlineData['mimeType'] ?? 'application/octet-stream')
      const data = String(inlineData['data'] ?? '')
      if (mimeType.startsWith('image/')) {
        return { type: 'image', data, mimeType, sourceType: 'base64' }
      }
      if (mimeType.startsWith('audio/')) {
        const format = mimeType.split('/')[1] ?? 'mp3'
        return { type: 'audio', data, mimeType, format }
      }
      return { type: 'document', data, mimeType, sourceType: 'base64' }
    }
    if ('fileData' in p) {
      const fileData = p['fileData'] as Record<string, unknown>
      const mimeType = String(fileData['mimeType'] ?? 'application/octet-stream')
      const url = String(fileData['fileUri'] ?? '')
      if (mimeType.startsWith('image/')) {
        return { type: 'image', data: url, mimeType, sourceType: 'url', url }
      }
      return { type: 'document', data: url, mimeType, sourceType: 'url', url }
    }
    return { type: 'text', text: JSON.stringify(p) }
  })
  return { role, parts }
}

function parseToInternal(
  message: OpenAIMessage | AnthropicMessage | GeminiContent,
  fromProvider: Provider,
): InternalMessage {
  switch (fromProvider) {
    case 'openai': return parseOpenAIMessage(message as OpenAIMessage)
    case 'anthropic': return parseAnthropicMessage(message as AnthropicMessage)
    case 'gemini': return parseGeminiContent(message as GeminiContent)
  }
}

function renderFromInternal(
  internal: InternalMessage,
  toProvider: Provider,
): OpenAIMessage | AnthropicMessage | GeminiContent {
  switch (toProvider) {
    case 'openai': return renderMessageOpenAI(internal)
    case 'anthropic': return renderMessageAnthropic(internal)
    case 'gemini': return renderMessageGemini(internal)
  }
}

export function convertMessage(
  message: OpenAIMessage | AnthropicMessage | GeminiContent,
  fromProvider: Provider,
  toProvider: Provider,
): OpenAIMessage | AnthropicMessage | GeminiContent {
  const internal = parseToInternal(message, fromProvider)
  return renderFromInternal(internal, toProvider)
}

export function convertConversation(
  input: OpenAIConversation | AnthropicConversation | GeminiConversation,
  fromProvider: Provider,
  toProvider: Provider,
): OpenAIConversation | AnthropicConversation | GeminiConversation {
  const internal: InternalConversation = { messages: [] }

  if (fromProvider === 'openai') {
    const conv = input as OpenAIConversation
    for (const m of conv.messages) {
      const parsed = parseOpenAIMessage(m)
      if (parsed.role === 'system') {
        internal.system = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      } else {
        internal.messages.push(parsed)
      }
    }
  } else if (fromProvider === 'anthropic') {
    const conv = input as AnthropicConversation
    if (conv.system) internal.system = conv.system
    for (const m of conv.messages) {
      internal.messages.push(parseAnthropicMessage(m))
    }
  } else {
    // gemini
    const conv = input as GeminiConversation
    if (conv.systemInstruction) {
      internal.system = conv.systemInstruction.parts.map((p) => p.text).join('')
    }
    for (const c of conv.contents) {
      internal.messages.push(parseGeminiContent(c))
    }
  }

  // Render to target provider
  if (toProvider === 'openai') {
    const messages: OpenAIMessage[] = []
    if (internal.system) {
      messages.push({ role: 'system', content: internal.system })
    }
    for (const m of internal.messages) {
      messages.push(renderMessageOpenAI(m))
    }
    return { messages }
  }

  if (toProvider === 'anthropic') {
    const messages: AnthropicMessage[] = []
    for (const m of internal.messages) {
      messages.push(renderMessageAnthropic(m))
    }
    const result: AnthropicConversation = { messages }
    if (internal.system) result.system = internal.system
    return result
  }

  // gemini
  const contents: GeminiContent[] = []
  for (const m of internal.messages) {
    contents.push(renderMessageGemini(m))
  }
  const result: GeminiConversation = { contents }
  if (internal.system) {
    result.systemInstruction = { parts: [{ text: internal.system }] }
  }
  return result
}
