import type { ContentPart, InternalMessage, GeminiContent } from './types.js'

function renderPart(part: ContentPart): Record<string, unknown> {
  switch (part.type) {
    case 'text':
      return { text: part.text }
    case 'image': {
      if (part.sourceType === 'url') {
        return { fileData: { mimeType: part.mimeType, fileUri: part.url ?? part.data } }
      }
      return { inlineData: { mimeType: part.mimeType, data: part.data } }
    }
    case 'audio':
      return { inlineData: { mimeType: part.mimeType, data: part.data } }
    case 'document': {
      if (part.sourceType === 'url') {
        return { fileData: { mimeType: part.mimeType, fileUri: part.url ?? part.data } }
      }
      return { inlineData: { mimeType: part.mimeType, data: part.data } }
    }
  }
}

export function renderMessageGemini(msg: InternalMessage): GeminiContent {
  const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user'
  const parts = msg.parts.map((p) => renderPart(p))
  return { role, parts }
}
