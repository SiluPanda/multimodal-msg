export type Provider = 'openai' | 'anthropic' | 'gemini'
export type ContentSource = Buffer | Uint8Array | string

export interface TextPart {
  type: 'text'
  text: string
}

export interface ImagePart {
  type: 'image'
  data: string
  mimeType: string
  sourceType: 'base64' | 'url'
  url?: string
  detail?: 'low' | 'high' | 'auto'
  filename?: string
}

export interface AudioPart {
  type: 'audio'
  data: string
  mimeType: string
  format: string
}

export interface DocumentPart {
  type: 'document'
  data: string
  mimeType: string
  sourceType: 'base64' | 'url'
  url?: string
  filename?: string
}

export type ContentPart = TextPart | ImagePart | AudioPart | DocumentPart

export interface InternalMessage {
  role: 'user' | 'assistant' | 'system'
  parts: ContentPart[]
}

export interface InternalConversation {
  system?: string
  messages: InternalMessage[]
}

export interface ImageOptions {
  mimeType?: string
  detail?: 'low' | 'high' | 'auto'
  filename?: string
}

export interface AudioOptions {
  mimeType?: string
  format?: string
}

export interface DocumentOptions {
  mimeType?: string
  filename?: string
}

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'developer'
  content: string | Array<Record<string, unknown>>
}

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | Array<Record<string, unknown>>
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: Array<Record<string, unknown>>
}

export interface OpenAIConversation {
  messages: OpenAIMessage[]
}

export interface AnthropicConversation {
  system?: string
  messages: AnthropicMessage[]
}

export interface GeminiConversation {
  systemInstruction?: { parts: Array<{ text: string }> }
  contents: GeminiContent[]
}

export interface MessageBuilder {
  text(text: string): MessageBuilder
  image(data: ContentSource, options?: ImageOptions): MessageBuilder
  audio(data: ContentSource, options?: AudioOptions): MessageBuilder
  document(data: ContentSource, options?: DocumentOptions): MessageBuilder
  forOpenAI(options?: { detail?: string }): OpenAIMessage
  forAnthropic(): AnthropicMessage
  forGemini(): GeminiContent
  for(provider: Provider): OpenAIMessage | AnthropicMessage | GeminiContent
  toJSON(): InternalMessage
}

export interface ConversationBuilder {
  system(text: string): ConversationBuilder
  user(msg: MessageBuilder | string): ConversationBuilder
  assistant(msg: MessageBuilder | string): ConversationBuilder
  forOpenAI(): OpenAIConversation
  forAnthropic(): AnthropicConversation
  forGemini(): GeminiConversation
  for(provider: Provider): OpenAIConversation | AnthropicConversation | GeminiConversation
  toJSON(): InternalConversation
}
