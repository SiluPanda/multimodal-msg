import type { ContentPart, InternalMessage, OpenAIMessage } from './types.js'

function renderPart(part: ContentPart, detail?: string): Record<string, unknown> {
  switch (part.type) {
    case 'text':
      return { type: 'text', text: part.text }
    case 'image': {
      if (part.sourceType === 'url') {
        return {
          type: 'image_url',
          image_url: {
            url: part.url ?? part.data,
            ...(detail || part.detail ? { detail: detail ?? part.detail } : {}),
          },
        }
      }
      return {
        type: 'image_url',
        image_url: {
          url: `data:${part.mimeType};base64,${part.data}`,
          ...(detail || part.detail ? { detail: detail ?? part.detail } : {}),
        },
      }
    }
    case 'audio':
      return {
        type: 'input_audio',
        input_audio: { data: part.data, format: part.format },
      }
    case 'document': {
      const label = part.filename ? `Document: ${part.filename}` : 'Document'
      return { type: 'text', text: `[${label}]` }
    }
  }
}

export function renderMessageOpenAI(
  msg: InternalMessage,
  options?: { detail?: string },
): OpenAIMessage {
  const role = msg.role
  const allText = msg.parts.every((p) => p.type === 'text')
  if (allText) {
    const content = msg.parts.map((p) => (p as { text: string }).text).join('')
    return { role, content }
  }
  const content = msg.parts.map((p) => renderPart(p, options?.detail))
  return { role, content }
}
