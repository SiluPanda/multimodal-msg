# multimodal-msg

Provider-agnostic multimodal message builder for OpenAI, Anthropic, and Gemini APIs.

[![npm version](https://img.shields.io/npm/v/multimodal-msg.svg)](https://www.npmjs.com/package/multimodal-msg)
[![npm downloads](https://img.shields.io/npm/dt/multimodal-msg.svg)](https://www.npmjs.com/package/multimodal-msg)
[![license](https://img.shields.io/npm/l/multimodal-msg.svg)](https://github.com/SiluPanda/multimodal-msg/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/multimodal-msg.svg)](https://www.npmjs.com/package/multimodal-msg)

## Description

Every major LLM provider accepts multimodal content in messages, but no two providers use the same format. OpenAI wraps images in `image_url` blocks with data URL encoding. Anthropic uses `source` objects with raw base64 and a separate `media_type` field. Gemini uses `inlineData` inside a `parts` array with different field names entirely. These differences extend across every content type: images, audio, documents, text, system messages, and role naming.

`multimodal-msg` solves this with a fluent builder API. Construct your multimodal message once, then render it for any supported provider. The package handles base64 encoding, data URL construction, MIME type detection, system message placement, and role mapping -- all with zero runtime dependencies and no I/O.

```typescript
import { msg } from 'multimodal-msg'

const message = msg('user')
  .text('Describe this image.')
  .image(imageBuffer)

message.forOpenAI()    // OpenAI-formatted message object
message.forAnthropic() // Anthropic-formatted message object
message.forGemini()    // Gemini-formatted message object
```

## Installation

```bash
npm install multimodal-msg
```

Requires Node.js 18 or later. Zero runtime dependencies.

## Quick Start

### Build a message and render for a provider

```typescript
import { msg } from 'multimodal-msg'
import { readFileSync } from 'fs'

const image = readFileSync('./photo.png')

const message = msg('user')
  .text('What is in this image?')
  .image(image)

// Render for OpenAI
const openaiMsg = message.forOpenAI()
// {
//   role: 'user',
//   content: [
//     { type: 'text', text: 'What is in this image?' },
//     { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
//   ]
// }

// Render for Anthropic
const anthropicMsg = message.forAnthropic()
// {
//   role: 'user',
//   content: [
//     { type: 'text', text: 'What is in this image?' },
//     { type: 'image', source: { type: 'base64', media_type: 'image/png', data: '...' } }
//   ]
// }

// Render for Gemini
const geminiMsg = message.forGemini()
// {
//   role: 'user',
//   parts: [
//     { text: 'What is in this image?' },
//     { inlineData: { mimeType: 'image/png', data: '...' } }
//   ]
// }
```

### Build a conversation

```typescript
import { conversation, msg } from 'multimodal-msg'

const image = readFileSync('./chart.png')

const conv = conversation()
  .system('You are a data analyst.')
  .user(
    msg('user')
      .text('What trend does this chart show?')
      .image(image)
  )
  .assistant('The chart shows a steady upward trend.')
  .user('Can you quantify the growth rate?')

conv.forOpenAI()    // system as first message in array
conv.forAnthropic() // system as top-level field, separate from messages
conv.forGemini()    // system as systemInstruction, assistant mapped to 'model' role
```

### Convert between providers

```typescript
import { convertMessage, convertConversation } from 'multimodal-msg'

// Convert a single message from OpenAI format to Anthropic format
const anthropicMsg = convertMessage(
  { role: 'user', content: 'Hello' },
  'openai',
  'anthropic'
)

// Convert an entire conversation from OpenAI format to Gemini format
const geminiConv = convertConversation(
  {
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' }
    ]
  },
  'openai',
  'gemini'
)
// {
//   systemInstruction: { parts: [{ text: 'You are helpful.' }] },
//   contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
// }
```

## Features

- **Three providers, one API** -- Build messages once, render for OpenAI, Anthropic, or Gemini with a single method call.
- **Full multimodal support** -- Text, images (Buffer, URL, base64, data URL), audio, and documents in a single fluent chain.
- **Automatic MIME detection** -- Detects MIME types from Buffer magic bytes, file extensions, and data URL prefixes. Override with explicit `mimeType` when needed.
- **Automatic encoding** -- Handles base64 encoding of Buffers, data URL construction for OpenAI, and raw base64 extraction for Anthropic and Gemini.
- **Conversation builder** -- Constructs multi-turn conversations with correct system message placement per provider (inline message for OpenAI, top-level field for Anthropic, `systemInstruction` for Gemini).
- **Cross-provider conversion** -- Convert existing provider-specific messages and conversations to any other provider format with `convertMessage` and `convertConversation`.
- **Provider-aware role mapping** -- Maps `assistant` to `model` for Gemini, handles `developer` role from OpenAI, and maps `system` to `user` for Anthropic message arrays.
- **Graceful degradation** -- Unsupported content types render as text fallbacks (e.g., audio on Anthropic renders as `[Audio not supported by Anthropic]`, documents on OpenAI render as `[Document: filename]`).
- **Serializable internal format** -- `.toJSON()` returns a provider-agnostic representation for logging, storage, and debugging.
- **Zero runtime dependencies** -- Uses only built-in Node.js APIs (`Buffer`). No external packages.
- **Full TypeScript support** -- Written in TypeScript with exported types for all interfaces, options, and provider output formats.

## API Reference

### `msg(role?): MessageBuilder`

Creates a new message builder.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role` | `'user' \| 'assistant' \| 'system'` | `'user'` | The message role. |

**Returns:** `MessageBuilder`

#### `MessageBuilder.text(text): MessageBuilder`

Adds a text content part to the message.

```typescript
msg('user').text('Hello, world!')
```

#### `MessageBuilder.image(data, options?): MessageBuilder`

Adds an image content part. Accepts a `Buffer`, `Uint8Array`, URL string, data URL string, or raw base64 string.

```typescript
// From a Buffer (MIME auto-detected from magic bytes)
msg('user').image(readFileSync('./photo.png'))

// From a URL
msg('user').image('https://example.com/photo.jpg')

// From a data URL
msg('user').image('data:image/gif;base64,R0lGODlh...')

// From a Buffer with explicit options
msg('user').image(buffer, { mimeType: 'image/webp', detail: 'high', filename: 'photo.webp' })
```

**Options (`ImageOptions`):**

| Option | Type | Description |
|--------|------|-------------|
| `mimeType` | `string` | Override auto-detected MIME type. |
| `detail` | `'low' \| 'high' \| 'auto'` | Image detail level (used by OpenAI). |
| `filename` | `string` | Optional filename metadata. |

#### `MessageBuilder.audio(data, options?): MessageBuilder`

Adds an audio content part. Accepts a `Buffer`, `Uint8Array`, or base64 string.

```typescript
msg('user').audio(audioBuffer, { mimeType: 'audio/mpeg', format: 'mp3' })
```

**Options (`AudioOptions`):**

| Option | Type | Description |
|--------|------|-------------|
| `mimeType` | `string` | Override auto-detected MIME type. |
| `format` | `string` | Audio format identifier (e.g., `'mp3'`, `'wav'`). Defaults to the subtype of the MIME type. |

#### `MessageBuilder.document(data, options?): MessageBuilder`

Adds a document content part. Accepts a `Buffer`, `Uint8Array`, URL string, or base64 string.

```typescript
msg('user').document(pdfBuffer, { mimeType: 'application/pdf', filename: 'report.pdf' })
```

**Options (`DocumentOptions`):**

| Option | Type | Description |
|--------|------|-------------|
| `mimeType` | `string` | Override auto-detected MIME type. |
| `filename` | `string` | Optional filename metadata. |

#### `MessageBuilder.forOpenAI(options?): OpenAIMessage`

Renders the message in OpenAI's API format.

```typescript
const result = msg('user').text('Hello').forOpenAI()
// { role: 'user', content: 'Hello' }
```

For text-only messages, `content` is a plain string. For multimodal messages, `content` is an array of content blocks.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `detail` | `string` | Override detail level for all image parts. |

#### `MessageBuilder.forAnthropic(): AnthropicMessage`

Renders the message in Anthropic's API format. System role messages are mapped to `user` role in the output.

```typescript
const result = msg('user').text('Hello').forAnthropic()
// { role: 'user', content: 'Hello' }
```

#### `MessageBuilder.forGemini(): GeminiContent`

Renders the message in Gemini's API format. The `assistant` role is mapped to `model`.

```typescript
const result = msg('assistant').text('Hello').forGemini()
// { role: 'model', parts: [{ text: 'Hello' }] }
```

#### `MessageBuilder.for(provider): OpenAIMessage | AnthropicMessage | GeminiContent`

Generic renderer that dispatches to the correct provider-specific method.

```typescript
const provider = 'anthropic'
const result = msg('user').text('Hello').for(provider)
```

#### `MessageBuilder.toJSON(): InternalMessage`

Returns the provider-agnostic internal representation.

```typescript
const internal = msg('user').text('Hello').toJSON()
// { role: 'user', parts: [{ type: 'text', text: 'Hello' }] }
```

---

### `conversation(): ConversationBuilder`

Creates a new conversation builder.

#### `ConversationBuilder.system(text): ConversationBuilder`

Sets the system message for the conversation.

```typescript
conversation().system('You are a helpful assistant.')
```

#### `ConversationBuilder.user(msg): ConversationBuilder`

Adds a user message. Accepts a string or a `MessageBuilder` instance.

```typescript
conversation()
  .user('Hello!')
  .user(msg('user').text('Look at this.').image(buffer))
```

#### `ConversationBuilder.assistant(msg): ConversationBuilder`

Adds an assistant message. Accepts a string or a `MessageBuilder` instance.

```typescript
conversation().assistant('I can help with that.')
```

#### `ConversationBuilder.forOpenAI(): OpenAIConversation`

Renders the conversation for OpenAI. The system message is included as the first message with `role: 'system'`.

```typescript
const result = conversation()
  .system('You are helpful.')
  .user('Hi')
  .forOpenAI()
// {
//   messages: [
//     { role: 'system', content: 'You are helpful.' },
//     { role: 'user', content: 'Hi' }
//   ]
// }
```

#### `ConversationBuilder.forAnthropic(): AnthropicConversation`

Renders the conversation for Anthropic. The system message is extracted to a top-level `system` field, separate from the `messages` array.

```typescript
const result = conversation()
  .system('You are helpful.')
  .user('Hi')
  .forAnthropic()
// {
//   system: 'You are helpful.',
//   messages: [{ role: 'user', content: 'Hi' }]
// }
```

#### `ConversationBuilder.forGemini(): GeminiConversation`

Renders the conversation for Gemini. The system message is placed in `systemInstruction`. The `assistant` role is mapped to `model`.

```typescript
const result = conversation()
  .system('You are helpful.')
  .user('Hi')
  .assistant('Hello!')
  .forGemini()
// {
//   systemInstruction: { parts: [{ text: 'You are helpful.' }] },
//   contents: [
//     { role: 'user', parts: [{ text: 'Hi' }] },
//     { role: 'model', parts: [{ text: 'Hello!' }] }
//   ]
// }
```

#### `ConversationBuilder.for(provider): OpenAIConversation | AnthropicConversation | GeminiConversation`

Generic renderer that dispatches to the correct provider-specific method.

#### `ConversationBuilder.toJSON(): InternalConversation`

Returns the provider-agnostic internal representation.

```typescript
const internal = conversation().system('sys').user('hi').toJSON()
// { system: 'sys', messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi' }] }] }
```

---

### `convertMessage(message, fromProvider, toProvider)`

Converts a single provider-specific message to another provider's format.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `OpenAIMessage \| AnthropicMessage \| GeminiContent` | The source message. |
| `fromProvider` | `Provider` | The provider format of the source message. |
| `toProvider` | `Provider` | The target provider format. |

**Returns:** `OpenAIMessage | AnthropicMessage | GeminiContent`

Handles conversion of all content types including text, images (both base64 and URL), audio, and documents. Parses provider-specific structures (OpenAI's `image_url` and `input_audio`, Anthropic's `source` blocks, Gemini's `inlineData` and `fileData`) into an internal representation, then renders for the target provider.

```typescript
import { convertMessage } from 'multimodal-msg'

// OpenAI image message to Anthropic
const anthropicMsg = convertMessage(
  {
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } }
    ]
  },
  'openai',
  'anthropic'
)
// content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc123' } }]
```

---

### `convertConversation(conversation, fromProvider, toProvider)`

Converts a full conversation from one provider's format to another.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `conversation` | `OpenAIConversation \| AnthropicConversation \| GeminiConversation` | The source conversation. |
| `fromProvider` | `Provider` | The provider format of the source conversation. |
| `toProvider` | `Provider` | The target provider format. |

**Returns:** `OpenAIConversation | AnthropicConversation | GeminiConversation`

Handles system message extraction and re-placement according to each provider's conventions. Converts all messages including their multimodal content parts.

```typescript
import { convertConversation } from 'multimodal-msg'

const geminiConv = convertConversation(
  {
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello!' }
    ]
  },
  'openai',
  'gemini'
)
// {
//   systemInstruction: { parts: [{ text: 'You are helpful.' }] },
//   contents: [
//     { role: 'user', parts: [{ text: 'Hi' }] },
//     { role: 'model', parts: [{ text: 'Hello!' }] }
//   ]
// }
```

---

### MIME Detection Utilities

#### `detectMimeFromBuffer(buf): string | null`

Detects MIME type from a Buffer's magic bytes. Supports JPEG, PNG, GIF, WebP, and PDF.

```typescript
import { detectMimeFromBuffer } from 'multimodal-msg'

const buf = readFileSync('./photo.png')
detectMimeFromBuffer(buf) // 'image/png'
```

#### `detectMimeFromExtension(filename): string | null`

Detects MIME type from a file extension. Supports: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.mp3`, `.wav`, `.ogg`, `.flac`, `.pdf`, `.txt`.

```typescript
import { detectMimeFromExtension } from 'multimodal-msg'

detectMimeFromExtension('photo.jpg')  // 'image/jpeg'
detectMimeFromExtension('clip.wav')   // 'audio/wav'
detectMimeFromExtension('file.xyz')   // null
```

#### `detectMimeFromDataUrl(dataUrl): string | null`

Extracts the MIME type from a data URL prefix.

```typescript
import { detectMimeFromDataUrl } from 'multimodal-msg'

detectMimeFromDataUrl('data:image/gif;base64,R0lGODlh...') // 'image/gif'
detectMimeFromDataUrl('not-a-data-url')                      // null
```

#### `resolveSource(source, options?)`

Resolves a `ContentSource` (Buffer, Uint8Array, or string) into a normalized `{ data, mimeType, sourceType }` object. This is the internal resolution function used by all builder methods.

- **Buffer/Uint8Array**: Base64-encodes the data and detects MIME from magic bytes.
- **Data URL string**: Extracts the base64 payload and parses the MIME type.
- **HTTP/HTTPS URL string**: Passes through as-is with `sourceType: 'url'`.
- **Raw base64 string**: Passes through as-is; requires `mimeType` or `filename` in options.

Throws an `Error` if MIME type cannot be determined and is not provided via options.

## Configuration

### Provider Output Format Reference

Each content type renders differently per provider:

| Content Type | OpenAI | Anthropic | Gemini |
|-------------|--------|-----------|--------|
| Text | `{ type: 'text', text }` | `{ type: 'text', text }` | `{ text }` |
| Image (base64) | `{ type: 'image_url', image_url: { url: 'data:...' } }` | `{ type: 'image', source: { type: 'base64', media_type, data } }` | `{ inlineData: { mimeType, data } }` |
| Image (URL) | `{ type: 'image_url', image_url: { url } }` | `{ type: 'image', source: { type: 'url', url } }` | `{ fileData: { mimeType, fileUri } }` |
| Audio | `{ type: 'input_audio', input_audio: { data, format } }` | `[text fallback]` | `{ inlineData: { mimeType, data } }` |
| Document (base64) | `[text fallback]` | `{ type: 'document', source: { type: 'base64', media_type, data } }` | `{ inlineData: { mimeType, data } }` |
| Document (URL) | `[text fallback]` | `{ type: 'document', source: { type: 'url', url } }` | `{ fileData: { mimeType, fileUri } }` |

### System Message Handling

Each provider handles system messages differently. The `ConversationBuilder` and `convertConversation` account for these differences automatically:

| Provider | System Message Placement |
|----------|-------------------------|
| OpenAI | Inline as first message: `{ role: 'system', content: '...' }` |
| Anthropic | Top-level field: `{ system: '...', messages: [...] }` |
| Gemini | Separate instruction: `{ systemInstruction: { parts: [{ text: '...' }] }, contents: [...] }` |

### Role Mapping

| Internal Role | OpenAI | Anthropic | Gemini |
|---------------|--------|-----------|--------|
| `user` | `user` | `user` | `user` |
| `assistant` | `assistant` | `assistant` | `model` |
| `system` | `system` | `user` | `user` |

## Error Handling

`multimodal-msg` throws standard `Error` instances in the following cases:

### MIME Type Detection Failure

When a `Buffer` is provided without an explicit `mimeType` and the magic bytes do not match any known format:

```typescript
const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03])

// Throws: "Cannot determine MIME type from buffer. Provide options.mimeType."
msg('user').image(unknownBuffer)

// Fix: provide mimeType explicitly
msg('user').image(unknownBuffer, { mimeType: 'image/webp' })
```

### Data URL Parse Failure

When a data URL string cannot be parsed for its MIME type:

```typescript
// Throws: "Cannot parse MIME type from data URL."
```

### Raw Base64 Without MIME Type

When a raw base64 string is provided without `mimeType` or `filename`:

```typescript
// Throws: "Cannot determine MIME type from base64 string. Provide options.mimeType or options.filename."
msg('user').image('aGVsbG8=')

// Fix: provide mimeType or filename
msg('user').image('aGVsbG8=', { mimeType: 'image/png' })
msg('user').image('aGVsbG8=', { filename: 'photo.png' })
```

### Unsupported Content Type Fallbacks

Rather than throwing, unsupported content types are rendered as text placeholders:

- **Audio on Anthropic**: `{ type: 'text', text: '[Audio not supported by Anthropic]' }`
- **Documents on OpenAI**: `{ type: 'text', text: '[Document: report.pdf]' }` (includes filename when available)

## Advanced Usage

### Builder Reuse

A single builder instance can render for multiple providers. The internal state is not modified by rendering:

```typescript
const message = msg('user')
  .text('Analyze this image.')
  .image('https://example.com/chart.png', { detail: 'high' })

const openai = message.forOpenAI()
const anthropic = message.forAnthropic()
const gemini = message.forGemini()
```

### Dynamic Provider Selection

Use the `.for(provider)` method when the target provider is determined at runtime:

```typescript
function sendToLLM(provider: Provider, prompt: string, imageUrl: string) {
  const message = msg('user').text(prompt).image(imageUrl)
  return message.for(provider)
}
```

### Multimodal Conversations with Mixed Content

Combine `MessageBuilder` instances with plain strings in a conversation:

```typescript
const conv = conversation()
  .system('You are a document analyst.')
  .user(
    msg('user')
      .text('Summarize this PDF.')
      .document(pdfBuffer, { mimeType: 'application/pdf', filename: 'report.pdf' })
  )
  .assistant('The report covers Q4 financial results...')
  .user('What about the charts on page 3?')
  .user(
    msg('user')
      .text('Here is page 3.')
      .image(page3Screenshot)
  )
```

### Cross-Provider Conversion with Multimodal Content

Convert messages containing images between providers. The converter handles format differences in base64 encoding, URL references, and content block structure:

```typescript
// An OpenAI message with a base64 image
const openaiMsg = {
  role: 'user' as const,
  content: [
    { type: 'text', text: 'Describe this.' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBOR...' } }
  ]
}

// Convert to Anthropic format
const anthropicMsg = convertMessage(openaiMsg, 'openai', 'anthropic')
// {
//   role: 'user',
//   content: [
//     { type: 'text', text: 'Describe this.' },
//     { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBOR...' } }
//   ]
// }
```

### Serialization and Logging

Use `.toJSON()` to capture the provider-agnostic internal representation for logging or storage. Reconstruct and render later for any provider:

```typescript
const internal = msg('user')
  .text('Hello')
  .image('https://example.com/img.png')
  .toJSON()

// internal is a plain JSON-serializable object:
// {
//   role: 'user',
//   parts: [
//     { type: 'text', text: 'Hello' },
//     { type: 'image', data: 'https://example.com/img.png', mimeType: 'image/png', sourceType: 'url', url: 'https://example.com/img.png' }
//   ]
// }
```

## TypeScript

`multimodal-msg` is written in TypeScript and ships type declarations alongside the compiled JavaScript. All public interfaces, option types, and provider output types are exported:

```typescript
import type {
  // Core types
  Provider,
  ContentSource,
  ContentPart,
  TextPart,
  ImagePart,
  AudioPart,
  DocumentPart,

  // Internal representation
  InternalMessage,
  InternalConversation,

  // Option types
  ImageOptions,
  AudioOptions,
  DocumentOptions,

  // Provider output types
  OpenAIMessage,
  AnthropicMessage,
  GeminiContent,

  // Provider conversation types
  OpenAIConversation,
  AnthropicConversation,
  GeminiConversation,

  // Builder interfaces
  MessageBuilder,
  ConversationBuilder,
} from 'multimodal-msg'
```

The `Provider` type is a string union (`'openai' | 'anthropic' | 'gemini'`) that can be used for type-safe provider selection:

```typescript
function renderForProvider(provider: Provider) {
  return msg('user').text('Hello').for(provider)
}
```

The `ContentSource` type (`Buffer | Uint8Array | string`) represents all accepted input formats for binary content methods (`.image()`, `.audio()`, `.document()`).

## License

MIT
