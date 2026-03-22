import type { ContentPart, InternalMessage, AnthropicMessage } from './types.js'

function renderPart(part: ContentPart): Record<string, unknown> {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text }
    case 'image': {
      if (part.sourceType === 'url') {
        return {
          type: 'image',
          source: { type: 'url', url: part.url ?? part.data },
        }
      }
      return {
        type: 'image',
        source: { type: 'base64', media_type: part.mimeType, data: part.data },
      }
    }
    case 'document': {
      if (part.sourceType === 'url') {
        return {
          type: 'document',
          source: { type: 'url', url: part.url ?? part.data },
        }
      }
      return {
        type: 'document',
        source: { type: 'base64', media_type: part.mimeType, data: part.data },
      }
    }
    case 'audio':
      return { type: 'text', text: '[Audio not supported by Anthropic]' }
  }
}

export function renderMessageAnthropic(msg: InternalMessage): AnthropicMessage {
  // Anthropic messages array only supports 'user' and 'assistant' roles
  const role: 'user' | 'assistant' = msg.role === 'assistant' ? 'assistant' : 'user'
  const allText = msg.parts.every((p) => p.type === 'text')
  if (allText) {
    const content = msg.parts.map((p) => (p as { text: string }).text).join('')
    return { role, content }
  }
  const content = msg.parts.map((p) => renderPart(p))
  return { role, content }
}
