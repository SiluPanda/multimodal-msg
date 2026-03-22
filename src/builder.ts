import type {
  MessageBuilder,
  ConversationBuilder,
  ContentSource,
  ImageOptions,
  AudioOptions,
  DocumentOptions,
  Provider,
  OpenAIMessage,
  AnthropicMessage,
  GeminiContent,
  OpenAIConversation,
  AnthropicConversation,
  GeminiConversation,
  InternalMessage,
  InternalConversation,
  ContentPart,
} from './types.js'
import { resolveSource } from './mime.js'
import { renderMessageOpenAI } from './render-openai.js'
import { renderMessageAnthropic } from './render-anthropic.js'
import { renderMessageGemini } from './render-gemini.js'

class MessageBuilderImpl implements MessageBuilder {
  private _role: 'user' | 'assistant' | 'system'
  private _parts: ContentPart[] = []

  constructor(role: 'user' | 'assistant' | 'system' = 'user') {
    this._role = role
  }

  text(text: string): MessageBuilder {
    this._parts.push({ type: 'text', text })
    return this
  }

  image(data: ContentSource, options?: ImageOptions): MessageBuilder {
    const resolved = resolveSource(data, { mimeType: options?.mimeType, filename: options?.filename })
    const part: ContentPart = {
      type: 'image',
      data: resolved.data,
      mimeType: resolved.mimeType,
      sourceType: resolved.sourceType,
      ...(resolved.sourceType === 'url' ? { url: resolved.data } : {}),
      ...(options?.detail ? { detail: options.detail } : {}),
      ...(options?.filename ? { filename: options.filename } : {}),
    }
    this._parts.push(part)
    return this
  }

  audio(data: ContentSource, options?: AudioOptions): MessageBuilder {
    const resolved = resolveSource(data, { mimeType: options?.mimeType })
    const format = options?.format ?? resolved.mimeType.split('/')[1] ?? 'mp3'
    const part: ContentPart = {
      type: 'audio',
      data: resolved.data,
      mimeType: resolved.mimeType,
      format,
    }
    this._parts.push(part)
    return this
  }

  document(data: ContentSource, options?: DocumentOptions): MessageBuilder {
    const resolved = resolveSource(data, { mimeType: options?.mimeType, filename: options?.filename })
    const part: ContentPart = {
      type: 'document',
      data: resolved.data,
      mimeType: resolved.mimeType,
      sourceType: resolved.sourceType,
      ...(resolved.sourceType === 'url' ? { url: resolved.data } : {}),
      ...(options?.filename ? { filename: options.filename } : {}),
    }
    this._parts.push(part)
    return this
  }

  forOpenAI(options?: { detail?: string }): OpenAIMessage {
    return renderMessageOpenAI(this.toJSON(), options)
  }

  forAnthropic(): AnthropicMessage {
    return renderMessageAnthropic(this.toJSON())
  }

  forGemini(): GeminiContent {
    return renderMessageGemini(this.toJSON())
  }

  for(provider: Provider): OpenAIMessage | AnthropicMessage | GeminiContent {
    switch (provider) {
      case 'openai': return this.forOpenAI()
      case 'anthropic': return this.forAnthropic()
      case 'gemini': return this.forGemini()
    }
  }

  toJSON(): InternalMessage {
    return { role: this._role, parts: [...this._parts] }
  }
}

class ConversationBuilderImpl implements ConversationBuilder {
  private _system?: string
  private _messages: InternalMessage[] = []

  system(text: string): ConversationBuilder {
    this._system = text
    return this
  }

  user(msgOrStr: MessageBuilder | string): ConversationBuilder {
    if (typeof msgOrStr === 'string') {
      this._messages.push({ role: 'user', parts: [{ type: 'text', text: msgOrStr }] })
    } else {
      const internal = msgOrStr.toJSON()
      this._messages.push({ ...internal, role: 'user' })
    }
    return this
  }

  assistant(msgOrStr: MessageBuilder | string): ConversationBuilder {
    if (typeof msgOrStr === 'string') {
      this._messages.push({ role: 'assistant', parts: [{ type: 'text', text: msgOrStr }] })
    } else {
      const internal = msgOrStr.toJSON()
      this._messages.push({ ...internal, role: 'assistant' })
    }
    return this
  }

  forOpenAI(): OpenAIConversation {
    const messages: OpenAIMessage[] = []
    if (this._system) {
      messages.push({ role: 'system', content: this._system })
    }
    for (const m of this._messages) {
      messages.push(renderMessageOpenAI(m))
    }
    return { messages }
  }

  forAnthropic(): AnthropicConversation {
    const messages: AnthropicMessage[] = []
    for (const m of this._messages) {
      if (m.role === 'system') continue
      messages.push(renderMessageAnthropic(m))
    }
    const result: AnthropicConversation = { messages }
    if (this._system) {
      result.system = this._system
    }
    return result
  }

  forGemini(): GeminiConversation {
    const contents: GeminiContent[] = []
    for (const m of this._messages) {
      if (m.role === 'system') continue
      contents.push(renderMessageGemini(m))
    }
    const result: GeminiConversation = { contents }
    if (this._system) {
      result.systemInstruction = { parts: [{ text: this._system }] }
    }
    return result
  }

  for(provider: Provider): OpenAIConversation | AnthropicConversation | GeminiConversation {
    switch (provider) {
      case 'openai': return this.forOpenAI()
      case 'anthropic': return this.forAnthropic()
      case 'gemini': return this.forGemini()
    }
  }

  toJSON(): InternalConversation {
    const result: InternalConversation = { messages: [...this._messages] }
    if (this._system) result.system = this._system
    return result
  }
}

export function msg(role: 'user' | 'assistant' | 'system' = 'user'): MessageBuilder {
  return new MessageBuilderImpl(role)
}

export function conversation(): ConversationBuilder {
  return new ConversationBuilderImpl()
}
