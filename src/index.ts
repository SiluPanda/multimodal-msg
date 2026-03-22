// multimodal-msg - Provider-agnostic multimodal message builder
export { msg, conversation } from './builder.js'
export { convertMessage, convertConversation } from './convert.js'
export {
  detectMimeFromBuffer,
  detectMimeFromExtension,
  detectMimeFromDataUrl,
  resolveSource,
} from './mime.js'
export type {
  Provider,
  ContentSource,
  TextPart,
  ImagePart,
  AudioPart,
  DocumentPart,
  ContentPart,
  InternalMessage,
  InternalConversation,
  ImageOptions,
  AudioOptions,
  DocumentOptions,
  OpenAIMessage,
  AnthropicMessage,
  GeminiContent,
  OpenAIConversation,
  AnthropicConversation,
  GeminiConversation,
  MessageBuilder,
  ConversationBuilder,
} from './types.js'
