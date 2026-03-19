# multimodal-msg -- Specification

## 1. Overview

`multimodal-msg` is a provider-agnostic multimodal message builder for LLM APIs. Given a sequence of content parts -- text, images, audio, documents, video -- and a target provider, it produces the exact message object that the provider's API expects. It answers the question "how do I send this multimodal content to this provider?" with a fluent builder API: `msg('user').text('Describe this').image(buffer).forOpenAI()`, returning a message object ready to pass directly to the provider's SDK.

The gap this package fills is specific and well-documented. Every major LLM provider accepts multimodal content in messages, but no two providers use the same format. OpenAI wraps images in `{ type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }` with data URL encoding. Anthropic uses `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "..." } }` with raw base64 and a separate `media_type` field. Google Gemini uses `{ inlineData: { mimeType: "image/jpeg", data: "..." } }` inside a `parts` array with no `type` discriminator and a different field name for the MIME type. These differences extend to every content type: audio uses `input_audio` on OpenAI but `inlineData` on Gemini and is unsupported natively on Anthropic. Documents use `{ type: "document", source: { type: "base64", media_type: "application/pdf", data: "..." } }` on Anthropic but require file upload or inline data on Gemini and are not natively supported as a distinct content type on OpenAI. Even text parts differ: OpenAI and Anthropic use `{ type: "text", text: "..." }` while Gemini uses `{ text: "..." }` without a `type` field.

The consequences of getting these formats wrong are immediate. Sending an OpenAI-formatted image block to Anthropic produces a 400 error because Anthropic does not recognize `image_url` as a content type. Sending raw base64 in Anthropic's `data` field to OpenAI fails because OpenAI expects a data URL prefix (`data:image/jpeg;base64,...`). Sending a `{ type: "text" }` block to Gemini fails because Gemini's `parts` array expects `{ text: "..." }` without a `type` wrapper. These are not subtle bugs -- they are hard failures that block the request entirely. Developers currently solve this by writing per-provider adapter functions for each content type, maintaining parallel message construction code, or using heavy frameworks like the Vercel AI SDK that handle format conversion internally but couple the developer to the framework's opinions, lifecycle, and dependency tree.

`multimodal-msg` provides a lightweight, standalone solution. A `msg()` builder constructs messages from content parts using a provider-agnostic internal representation. A `conversation()` builder constructs full conversation arrays including system messages, with awareness of provider differences in system message handling (OpenAI uses a `system` role message, Anthropic uses a separate `system` parameter outside the messages array). A `convertMessage()` function takes an existing provider-specific message and converts it to another provider's format, enabling provider migration without rewriting message construction code. The package has zero runtime dependencies, operates entirely on in-memory objects with no I/O, and weighs under 15 KB bundled.

The package composes with other packages in this monorepo. `vision-prep` handles image preparation (resizing, compression, token estimation) and produces raw base64 data and MIME types -- `multimodal-msg` takes those outputs and wraps them in the correct provider-specific content block format. `audio-chunker` splits audio streams into provider-compatible segments -- `multimodal-msg` takes those segments and wraps them in the correct audio content format. `schema-bridge` converts schemas across providers -- `multimodal-msg` converts messages across providers. The two are complementary: `schema-bridge` handles the tool definition layer, `multimodal-msg` handles the message content layer.

---

## 2. Goals and Non-Goals

### Goals

- Provide a `msg(role?)` function that returns a `MessageBuilder` with a fluent API for constructing multimodal messages containing text, images, audio, documents, and video content parts.
- Provide per-provider rendering methods -- `.forOpenAI()`, `.forAnthropic()`, `.forGemini()` -- that convert the internal representation to the exact message object the provider's API expects.
- Provide a generic `.for(provider)` method that accepts a provider string and dispatches to the correct renderer.
- Provide a `conversation()` function that returns a `ConversationBuilder` for constructing full conversation arrays with system, user, and assistant messages, handling provider differences in system message placement.
- Provide a `convertMessage(message, fromProvider, toProvider)` function that takes an existing provider-specific message object and converts it to another provider's format.
- Provide a `convertConversation(messages, fromProvider, toProvider)` function that takes a full conversation array in one provider's format and converts it to another provider's format, handling system message differences.
- Support all major content types: text, image (from Buffer, base64 string, URL, or file path), audio (from Buffer, base64 string, or file path), document/PDF (from Buffer, base64 string, URL, or file path), and video (from URL or file URI).
- Auto-detect MIME types from Buffer magic bytes, file extensions, or data URL prefixes when the caller does not specify the MIME type explicitly.
- Auto-encode content appropriately per provider: wrap base64 in data URLs for OpenAI, pass raw base64 for Anthropic and Gemini, strip data URL prefixes when present and the provider expects raw base64.
- Handle unsupported content types gracefully: when a content part uses a type that the target provider does not support (e.g., audio for Anthropic, documents for OpenAI), the behavior is configurable -- throw an error, skip the part with a warning, or include the part as-is with a warning.
- Return a `.toJSON()` representation of the internal provider-agnostic format for serialization, logging, and debugging.
- Keep runtime dependencies to zero. Use only built-in Node.js APIs (`Buffer`, `fs.readFile`, `path.extname`).
- Target Node.js 18+.

### Non-Goals

- **Not an image processor.** This package does not resize, compress, or optimize images. It wraps already-prepared image data in the correct provider format. For image preparation (resizing, compression, token estimation), use `vision-prep`. `multimodal-msg` takes `vision-prep`'s output and formats it for the target provider.
- **Not an audio processor.** This package does not transcode, split, or resample audio. It wraps audio data in the correct provider format. For audio chunking, use `audio-chunker`.
- **Not an LLM client.** This package produces message objects. It does not make API calls to any provider. The caller is responsible for passing the rendered message to the provider's SDK (`openai`, `@anthropic-ai/sdk`, `@google/generative-ai`).
- **Not a token counter.** This package does not estimate token costs for content parts. For token estimation, use `vision-prep` (images), `prompt-price` (text), or provider-specific token counting utilities.
- **Not a file upload manager.** When a provider requires content to be uploaded via a Files API (e.g., Gemini's Files API for large media), this package does not perform the upload. It produces the reference format (`fileData` with `fileUri` for Gemini) that points to already-uploaded content.
- **Not a streaming handler.** This package constructs static message objects for API requests. It does not handle streaming responses, server-sent events, or real-time audio streams.
- **Not a validation library.** This package does not validate that content data is well-formed (e.g., that a Buffer is a valid JPEG, that a base64 string decodes correctly, that a URL is reachable). It trusts the caller to provide valid content. Validation belongs in the preparation layer (`vision-prep`, `audio-chunker`).

---

## 3. Target Users and Use Cases

### Multi-Provider Application Developers

Developers building applications that support multiple LLM providers simultaneously -- for example, a chat application where the user selects their preferred provider (OpenAI, Anthropic, Gemini) and the application routes requests accordingly. These developers construct multimodal messages once using the builder API and render them for whichever provider the user selected. Without `multimodal-msg`, they maintain three parallel code paths for every message construction site, each with different field names, encoding conventions, and content type structures. A typical integration replaces 30-50 lines of per-provider message formatting with a single builder chain: `msg('user').text(prompt).image(imageData).for(selectedProvider)`.

### Provider Migration Teams

Teams migrating from one LLM provider to another. They have existing message construction code that produces OpenAI-formatted messages and need to produce Anthropic-formatted messages instead. `convertConversation()` takes the existing OpenAI messages array and produces an Anthropic messages array, handling system message extraction (OpenAI's system role message becomes Anthropic's separate `system` parameter), image format conversion (data URL to raw base64), and content type mapping.

### AI Agent Framework Authors

Teams building agent orchestration frameworks that support pluggable LLM providers. The framework needs to construct multimodal messages (tool results with images, user messages with attachments) in a provider-agnostic way and render them for whichever provider the framework is configured to use. `multimodal-msg` provides the message construction layer, freeing the framework author from implementing per-provider content formatting.

### Multimodal Chatbot Developers

Developers building chatbots that accept image, audio, or document uploads from users and forward them to an LLM for analysis. The chatbot receives user uploads as Buffers, constructs a multimodal message with the uploaded content and a text prompt, and renders it for the configured provider. `multimodal-msg` handles MIME type detection, base64 encoding, and provider-specific formatting.

### Testing and Prototyping

Developers experimenting with different providers' multimodal capabilities who want to send the same content to multiple providers and compare results. The builder constructs the content once, and the developer calls `.forOpenAI()`, `.forAnthropic()`, and `.forGemini()` to get all three formats from a single definition.

---

## 4. Core Concepts

### Content Part

A content part is a single piece of content within a message: a text string, an image, an audio clip, a document, or a video reference. Content parts are the atomic units of multimodal messages. Each content part has a type, data (the actual content), and metadata (MIME type, encoding, provider-specific options). The `multimodal-msg` internal representation of a content part is provider-agnostic; provider-specific formatting is applied during rendering.

### Message

A message is a role-tagged collection of content parts. In all three providers, a message has a `role` (`user`, `assistant`, or `system`) and content. For simple text-only messages, content is a string. For multimodal messages, content is an array of content parts. A `MessageBuilder` constructs a message incrementally by adding content parts, then renders it for a target provider.

### Provider

A provider identifies the target LLM API. Supported providers are `'openai'`, `'anthropic'`, and `'gemini'`. Each provider has different content block formats, different base64 encoding conventions, different MIME type field names, and different supported content types. The provider determines every aspect of the rendered output.

### Rendering

Rendering is the process of converting the internal provider-agnostic message representation to a provider-specific message object. Each provider has a renderer that knows the provider's content block format, encoding conventions, and structural requirements. Rendering is the final step in the builder chain and produces the object that the caller passes to the provider's SDK.

### Conversation

A conversation is an ordered sequence of messages representing a multi-turn interaction. A `ConversationBuilder` constructs a conversation incrementally by adding system, user, and assistant messages. Conversations require special handling during rendering because providers handle system messages differently: OpenAI includes system messages as `{ role: "system", content: "..." }` in the messages array, Anthropic extracts the system message into a separate `system` parameter outside the messages array, and Gemini uses `{ role: "user", parts: [{ text: "..." }] }` with system instructions set separately in `systemInstruction`.

### Internal Representation

The internal representation is the provider-agnostic data structure that the builder maintains before rendering. It consists of a role, an array of typed content parts (each with its data and metadata), and optional message-level metadata. The internal representation is the single source of truth from which all provider-specific formats are derived. It can be serialized to JSON via `.toJSON()` for logging, debugging, or storage.

---

## 5. Provider Format Comparison

This section catalogs the exact content block format for each content type on each provider. This catalog is the core knowledge base that `multimodal-msg` encodes in its provider renderers.

### Text Content

The simplest content type. All providers support text, but the format differs.

**OpenAI:**

```json
{
  "type": "text",
  "text": "Describe this image."
}
```

**Anthropic:**

```json
{
  "type": "text",
  "text": "Describe this image."
}
```

**Gemini:**

```json
{
  "text": "Describe this image."
}
```

Note: Gemini does not use a `type` discriminator. Text parts are identified by the presence of the `text` key.

### Image Content (Base64)

The most common multimodal content type. All three providers support base64-encoded images, but the wrapping format differs significantly.

**OpenAI:**

```json
{
  "type": "image_url",
  "image_url": {
    "url": "data:image/jpeg;base64,/9j/4AAQ...",
    "detail": "auto"
  }
}
```

OpenAI wraps base64 image data in a data URL (`data:{mimeType};base64,{data}`) inside an `image_url` object. The `detail` field controls processing fidelity (`"low"`, `"high"`, `"auto"`). The content type is `"image_url"`, not `"image"`.

**Anthropic:**

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/jpeg",
    "data": "/9j/4AAQ..."
  }
}
```

Anthropic uses raw base64 (no data URL prefix) in a `source` object with a `type` discriminator (`"base64"`), a `media_type` field for the MIME type, and a `data` field for the raw base64 string. The content type is `"image"`, not `"image_url"`.

**Gemini:**

```json
{
  "inlineData": {
    "mimeType": "image/jpeg",
    "data": "/9j/4AAQ..."
  }
}
```

Gemini uses raw base64 in an `inlineData` object with `mimeType` (camelCase, not `media_type` or `type`) and `data`. No `type` discriminator. No data URL prefix.

**Key differences:**

| Aspect | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Content type key | `"image_url"` | `"image"` | (none -- `inlineData` key) |
| Base64 encoding | Data URL (`data:...;base64,...`) | Raw base64 | Raw base64 |
| MIME type location | Inside data URL string | `source.media_type` | `inlineData.mimeType` |
| MIME type field name | (embedded in URL) | `media_type` (snake_case) | `mimeType` (camelCase) |
| Nesting depth | 2 (`image_url.url`) | 3 (`source.type`, `source.media_type`, `source.data`) | 2 (`inlineData.mimeType`, `inlineData.data`) |
| Extra options | `detail` | (none) | (none) |

### Image Content (URL)

All three providers support referencing images by URL, but with different formats.

**OpenAI:**

```json
{
  "type": "image_url",
  "image_url": {
    "url": "https://example.com/photo.jpg",
    "detail": "auto"
  }
}
```

The same `image_url` format is used for both base64 and URL images. The `url` field accepts either a data URL or an HTTPS URL.

**Anthropic:**

```json
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://example.com/photo.jpg"
  }
}
```

Anthropic uses a `source` object with `type: "url"` (distinct from `type: "base64"`) and a `url` field. Note the `source.type` changes from `"base64"` to `"url"`.

**Gemini:**

```json
{
  "fileData": {
    "mimeType": "image/jpeg",
    "fileUri": "https://example.com/photo.jpg"
  }
}
```

Gemini uses `fileData` (not `inlineData`) with `fileUri` (not `url`). The `mimeType` must be specified explicitly; it is not inferred from the URL.

**Key differences:**

| Aspect | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Content type key | `"image_url"` | `"image"` | (none -- `fileData` key) |
| URL field | `image_url.url` | `source.url` | `fileData.fileUri` |
| Source type discriminator | (none -- same format for URL and base64) | `source.type: "url"` | (none -- `fileData` vs `inlineData`) |
| MIME type required | No (inferred) | No (inferred) | Yes (`fileData.mimeType`) |

### Audio Content

Audio support varies significantly across providers.

**OpenAI:**

```json
{
  "type": "input_audio",
  "input_audio": {
    "data": "UklGR...",
    "format": "wav"
  }
}
```

OpenAI uses `input_audio` (not `audio`) with raw base64 data and a `format` field (`"wav"`, `"mp3"`). The `format` is a short codec identifier, not a full MIME type.

**Anthropic:**

Anthropic does not natively support audio content parts in messages as of the current API. Audio must be processed externally (transcribed to text or converted to a supported format) before being sent as a message content part. `multimodal-msg` handles this by either throwing an error (default), skipping the audio part with a warning, or including a text placeholder noting that audio was omitted, depending on the `unsupportedBehavior` configuration.

**Gemini:**

```json
{
  "inlineData": {
    "mimeType": "audio/wav",
    "data": "UklGR..."
  }
}
```

Gemini uses the same `inlineData` format as images, with `mimeType` set to the audio MIME type (`"audio/wav"`, `"audio/mp3"`, `"audio/ogg"`, etc.).

**Key differences:**

| Aspect | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Supported | Yes | No (native) | Yes |
| Content type key | `"input_audio"` | N/A | (none -- `inlineData` key) |
| Format specification | `format` field (`"wav"`, `"mp3"`) | N/A | `mimeType` field (`"audio/wav"`) |
| Base64 encoding | Raw base64 | N/A | Raw base64 |

### Document / PDF Content

Document support varies across providers.

**OpenAI:**

OpenAI supports PDF input through the `file` content type (added in 2025):

```json
{
  "type": "file",
  "file": {
    "filename": "document.pdf",
    "file_data": "data:application/pdf;base64,JVBERi0..."
  }
}
```

OpenAI uses a data URL encoding for the file data, similar to images. The `filename` field is required.

**Anthropic:**

```json
{
  "type": "document",
  "source": {
    "type": "base64",
    "media_type": "application/pdf",
    "data": "JVBERi0..."
  }
}
```

Anthropic uses `type: "document"` with the same `source` structure as images (raw base64, `media_type`, `type` discriminator). Also supports `type: "url"` for URL-referenced documents, and a `type: "content"` for text-based documents like plain text, HTML, and Markdown.

**Gemini:**

```json
{
  "inlineData": {
    "mimeType": "application/pdf",
    "data": "JVBERi0..."
  }
}
```

Gemini uses the same `inlineData` format as images and audio, with `mimeType` set to `"application/pdf"`.

**Key differences:**

| Aspect | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Content type key | `"file"` | `"document"` | (none -- `inlineData` key) |
| Base64 encoding | Data URL | Raw base64 | Raw base64 |
| MIME type location | Inside data URL | `source.media_type` | `inlineData.mimeType` |
| URL support | No (base64 only) | Yes (`source.type: "url"`) | Yes (`fileData`) |
| Filename | Required (`file.filename`) | Optional | N/A |

### Video Content

Video support is limited and varies significantly.

**OpenAI:**

OpenAI does not support video content parts in messages as of the current API. Video must be processed externally (extracted frames, transcribed audio) before being sent.

**Anthropic:**

Anthropic does not support video content parts in messages as of the current API.

**Gemini:**

```json
{
  "fileData": {
    "mimeType": "video/mp4",
    "fileUri": "gs://bucket/video.mp4"
  }
}
```

Gemini supports video via the `fileData` format with a file URI (Google Cloud Storage or Files API URI). Inline base64 video is supported for small files via `inlineData`. Supported formats include MP4, MPEG, MOV, AVI, FLV, MKV, WebM, and WMV.

**Key differences:**

| Aspect | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Supported | No | No | Yes |
| Format | N/A | N/A | `fileData` with `fileUri` or `inlineData` |

### Content Type Support Matrix

| Content Type | OpenAI | Anthropic | Gemini |
|---|---|---|---|
| Text | `{ type: "text", text }` | `{ type: "text", text }` | `{ text }` |
| Image (base64) | `{ type: "image_url", image_url: { url: dataURL } }` | `{ type: "image", source: { type: "base64", media_type, data } }` | `{ inlineData: { mimeType, data } }` |
| Image (URL) | `{ type: "image_url", image_url: { url } }` | `{ type: "image", source: { type: "url", url } }` | `{ fileData: { mimeType, fileUri } }` |
| Audio (base64) | `{ type: "input_audio", input_audio: { data, format } }` | Not supported | `{ inlineData: { mimeType, data } }` |
| Document (base64) | `{ type: "file", file: { filename, file_data: dataURL } }` | `{ type: "document", source: { type: "base64", media_type, data } }` | `{ inlineData: { mimeType, data } }` |
| Document (URL) | Not supported | `{ type: "document", source: { type: "url", url } }` | `{ fileData: { mimeType, fileUri } }` |
| Video (URL) | Not supported | Not supported | `{ fileData: { mimeType, fileUri } }` |
| Video (inline) | Not supported | Not supported | `{ inlineData: { mimeType, data } }` |

### Message Envelope Comparison

Beyond content blocks, the message envelope differs across providers.

**OpenAI message:**

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image_url", "image_url": { "url": "..." } }
  ]
}
```

Content is an array of content parts. For text-only messages, content can be a plain string.

**Anthropic message:**

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "..." },
    { "type": "image", "source": { "type": "base64", "media_type": "...", "data": "..." } }
  ]
}
```

Content is an array of content parts. For text-only messages, content can be a plain string.

**Gemini content:**

```json
{
  "role": "user",
  "parts": [
    { "text": "..." },
    { "inlineData": { "mimeType": "...", "data": "..." } }
  ]
}
```

Gemini uses `parts` instead of `content`. The `role` is `"user"` or `"model"` (not `"assistant"`). Gemini does not include `"system"` role messages in the `contents` array -- system instructions are passed separately.

### System Message Handling

| Provider | System Message Format |
|---|---|
| OpenAI | `{ role: "system", content: "..." }` or `{ role: "developer", content: "..." }` in the messages array |
| Anthropic | Separate `system` parameter at the API call level, not in the `messages` array |
| Gemini | `systemInstruction` parameter at the API call level, formatted as `{ parts: [{ text: "..." }] }` |

This difference is critical for `convertConversation()`: when converting from OpenAI to Anthropic, the system message must be extracted from the messages array and returned as a separate field. When converting from Anthropic to OpenAI, the separate system parameter must be injected into the messages array as the first message.

---

## 6. Message Builder API

### `msg(role?)`

Creates a new `MessageBuilder` instance. The optional `role` parameter defaults to `'user'`.

```typescript
import { msg } from 'multimodal-msg';

const message = msg('user')
  .text('What is in this image?')
  .image(imageBuffer, { mimeType: 'image/jpeg' })
  .forOpenAI();
```

### `.text(content)`

Adds a text content part to the message.

```typescript
msg('user')
  .text('Describe the following image in detail.')
  .text('Pay attention to colors and shapes.')  // multiple text parts are allowed
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string` | Yes | The text content |

### `.image(source, options?)`

Adds an image content part to the message.

```typescript
// From Buffer
msg('user').image(buffer)

// From base64 string (with or without data URL prefix)
msg('user').image('data:image/png;base64,iVBOR...')
msg('user').image('iVBOR...')  // raw base64, mimeType must be specified or auto-detected

// From URL
msg('user').image('https://example.com/photo.jpg')

// From file path
msg('user').image('/path/to/photo.jpg')

// With options
msg('user').image(buffer, {
  mimeType: 'image/jpeg',
  detail: 'high',       // OpenAI-specific, passed through when rendering for OpenAI
  filename: 'photo.jpg', // used by OpenAI file format
})
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `Buffer \| Uint8Array \| string` | Yes | Image data as Buffer, base64 string (with or without data URL prefix), URL (http/https), or file path |
| `options.mimeType` | `string` | No | MIME type (e.g., `'image/jpeg'`). Auto-detected from Buffer magic bytes, data URL prefix, file extension, or URL path if not specified. |
| `options.detail` | `'low' \| 'high' \| 'auto'` | No | OpenAI detail mode. Ignored for other providers. Default: `'auto'` |
| `options.filename` | `string` | No | Filename hint. Used by OpenAI's file content type for documents. |

**Source type detection:**

When `source` is a string, the type is determined by inspection:

| Pattern | Detected Type |
|---|---|
| Starts with `http://` or `https://` | URL |
| Starts with `data:` | Base64 data URL (prefix is parsed for MIME type, then stripped) |
| Contains only base64-valid characters and length > 260 | Raw base64 string |
| All other strings | File path |

### `.audio(source, options?)`

Adds an audio content part to the message.

```typescript
// From Buffer
msg('user').audio(audioBuffer, { mimeType: 'audio/wav' })

// From file path
msg('user').audio('/path/to/recording.mp3')

// With format hint for OpenAI
msg('user').audio(audioBuffer, { format: 'wav' })
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `Buffer \| Uint8Array \| string` | Yes | Audio data as Buffer, base64 string, or file path |
| `options.mimeType` | `string` | No | MIME type (e.g., `'audio/wav'`). Auto-detected from magic bytes or extension. |
| `options.format` | `'wav' \| 'mp3' \| 'ogg' \| 'flac' \| 'webm'` | No | Audio format identifier. Used by OpenAI's `input_audio.format`. Inferred from `mimeType` if not specified. |

### `.document(source, options?)`

Adds a document content part to the message. Primarily for PDF files, but supports other document types.

```typescript
// From Buffer
msg('user').document(pdfBuffer, { mimeType: 'application/pdf' })

// From file path
msg('user').document('/path/to/report.pdf')

// From URL (supported by Anthropic and Gemini)
msg('user').document('https://example.com/report.pdf')
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `Buffer \| Uint8Array \| string` | Yes | Document data as Buffer, base64 string, URL, or file path |
| `options.mimeType` | `string` | No | MIME type (e.g., `'application/pdf'`). Auto-detected from magic bytes or extension. |
| `options.filename` | `string` | No | Filename for the document. Used by OpenAI's file format. Inferred from file path if available. |

### `.video(source, options?)`

Adds a video content part to the message. Currently only supported by Gemini.

```typescript
// From URL or file URI
msg('user').video('gs://bucket/video.mp4', { mimeType: 'video/mp4' })
msg('user').video('https://example.com/video.mp4', { mimeType: 'video/mp4' })

// From Buffer (inline, for small videos)
msg('user').video(videoBuffer, { mimeType: 'video/mp4' })
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `Buffer \| Uint8Array \| string` | Yes | Video data as Buffer, base64 string, URL, or file URI (`gs://...`) |
| `options.mimeType` | `string` | No | MIME type (e.g., `'video/mp4'`). Required for URL sources; auto-detected for Buffers and file paths. |

### `.for(provider)`

Renders the message for a specific provider. Returns the provider-specific message object.

```typescript
const openaiMsg = msg('user').text('Hello').image(buf).for('openai');
const anthropicMsg = msg('user').text('Hello').image(buf).for('anthropic');
const geminiMsg = msg('user').text('Hello').image(buf).for('gemini');
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `provider` | `'openai' \| 'anthropic' \| 'gemini'` | Yes | Target provider |

**Returns:** The provider-specific message object (see Section 8 for exact return types).

### `.forOpenAI(options?)`

Convenience method equivalent to `.for('openai')`, with OpenAI-specific options.

```typescript
const message = msg('user')
  .text('Describe this')
  .image(buffer)
  .forOpenAI({ detail: 'high' });
```

The `detail` option sets the default detail level for all image parts in this message that do not have their own `detail` option. Defaults to `'auto'`.

### `.forAnthropic()`

Convenience method equivalent to `.for('anthropic')`.

```typescript
const message = msg('user')
  .text('Describe this')
  .image(buffer)
  .forAnthropic();
```

### `.forGemini()`

Convenience method equivalent to `.for('gemini')`.

```typescript
const message = msg('user')
  .text('Describe this')
  .image(buffer)
  .forGemini();
```

### `.toJSON()`

Returns the provider-agnostic internal representation as a plain JSON-serializable object. Useful for logging, debugging, serialization, and storage.

```typescript
const internal = msg('user')
  .text('Hello')
  .image(buffer, { mimeType: 'image/jpeg' })
  .toJSON();

// {
//   role: 'user',
//   parts: [
//     { type: 'text', text: 'Hello' },
//     { type: 'image', data: 'base64...', mimeType: 'image/jpeg', sourceType: 'base64' }
//   ]
// }
```

### Method Chaining

All content-adding methods return the `MessageBuilder` instance, enabling fluent chaining:

```typescript
const message = msg('user')
  .text('Here are two images. Compare them.')
  .image(buffer1, { mimeType: 'image/jpeg' })
  .image(buffer2, { mimeType: 'image/png' })
  .text('Focus on the differences in color.')
  .forOpenAI();
```

Content parts are rendered in the order they are added. The order matters for some providers -- placing text before images is a common best practice for multimodal prompting.

---

## 7. Content Part Types (Internal Representation)

The internal representation uses a discriminated union of content part types. These types are provider-agnostic and represent the canonical form of each content type.

### `TextPart`

```typescript
interface TextPart {
  type: 'text';
  text: string;
}
```

A plain text content part. No encoding or transformation is needed during rendering -- the text is passed through to the provider's format.

### `ImagePart`

```typescript
interface ImagePart {
  type: 'image';
  data: string;           // base64-encoded image data (no data URL prefix)
  mimeType: string;       // e.g., 'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  sourceType: 'base64' | 'url';
  url?: string;           // present when sourceType is 'url'
  detail?: 'low' | 'high' | 'auto';  // OpenAI-specific hint
  filename?: string;      // optional filename
}
```

When `sourceType` is `'base64'`, the `data` field contains the raw base64-encoded image data (without a data URL prefix). When `sourceType` is `'url'`, the `url` field contains the URL and the `data` field is empty -- the URL is passed through to providers that support URL-based image references.

### `AudioPart`

```typescript
interface AudioPart {
  type: 'audio';
  data: string;           // base64-encoded audio data
  mimeType: string;       // e.g., 'audio/wav', 'audio/mp3', 'audio/ogg'
  format: string;         // codec identifier: 'wav', 'mp3', 'ogg', 'flac', 'webm'
}
```

The `format` field is the short codec identifier used by OpenAI's `input_audio.format` field. It is derived from the `mimeType` during construction (e.g., `'audio/wav'` becomes `'wav'`, `'audio/mpeg'` becomes `'mp3'`).

### `DocumentPart`

```typescript
interface DocumentPart {
  type: 'document';
  data: string;           // base64-encoded document data (empty when sourceType is 'url')
  mimeType: string;       // e.g., 'application/pdf'
  sourceType: 'base64' | 'url';
  url?: string;           // present when sourceType is 'url'
  filename?: string;      // optional filename
}
```

### `VideoPart`

```typescript
interface VideoPart {
  type: 'video';
  data: string;           // base64-encoded video data (empty when sourceType is 'url')
  mimeType: string;       // e.g., 'video/mp4'
  sourceType: 'base64' | 'url';
  url?: string;           // present when sourceType is 'url' or file URI
}
```

### Union Type

```typescript
type ContentPart = TextPart | ImagePart | AudioPart | DocumentPart | VideoPart;
```

### Internal Message

```typescript
interface InternalMessage {
  role: 'user' | 'assistant' | 'system';
  parts: ContentPart[];
}
```

---

## 8. Provider Rendering

### OpenAI Renderer

The OpenAI renderer converts each internal content part to OpenAI's content format and wraps them in an OpenAI message object.

**Rendering rules:**

| Internal Part | OpenAI Output |
|---|---|
| `TextPart` | `{ type: "text", text }` |
| `ImagePart` (base64) | `{ type: "image_url", image_url: { url: "data:{mimeType};base64,{data}", detail } }` |
| `ImagePart` (URL) | `{ type: "image_url", image_url: { url, detail } }` |
| `AudioPart` | `{ type: "input_audio", input_audio: { data, format } }` |
| `DocumentPart` (base64) | `{ type: "file", file: { filename, file_data: "data:{mimeType};base64,{data}" } }` |
| `DocumentPart` (URL) | Unsupported -- behavior per `unsupportedBehavior` config |
| `VideoPart` | Unsupported -- behavior per `unsupportedBehavior` config |

**Output type:**

```typescript
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string | OpenAIContentPart[];
}
```

When the message contains only a single text part, the renderer may produce `content: "text string"` instead of `content: [{ type: "text", text: "text string" }]` when `compactText` is enabled (default: `false`). This is valid OpenAI syntax and produces smaller payloads.

**System messages:** OpenAI supports system messages directly in the messages array with `role: "system"` or `role: "developer"` (the newer recommended role for system-level instructions). The `systemRole` configuration option controls which role to use (default: `'system'`).

### Anthropic Renderer

The Anthropic renderer converts each internal content part to Anthropic's content format.

**Rendering rules:**

| Internal Part | Anthropic Output |
|---|---|
| `TextPart` | `{ type: "text", text }` |
| `ImagePart` (base64) | `{ type: "image", source: { type: "base64", media_type: mimeType, data } }` |
| `ImagePart` (URL) | `{ type: "image", source: { type: "url", url } }` |
| `AudioPart` | Unsupported -- behavior per `unsupportedBehavior` config |
| `DocumentPart` (base64) | `{ type: "document", source: { type: "base64", media_type: mimeType, data } }` |
| `DocumentPart` (URL) | `{ type: "document", source: { type: "url", url } }` |
| `VideoPart` | Unsupported -- behavior per `unsupportedBehavior` config |

**Output type:**

```typescript
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentPart[];
}
```

**System messages:** Anthropic does not support system messages in the messages array. When rendering a conversation, system messages are extracted and returned as a separate `system` string. When rendering a single message with `role: 'system'`, the renderer throws an error -- system messages must be handled at the conversation level via `ConversationBuilder`.

### Gemini Renderer

The Gemini renderer converts each internal content part to Gemini's `parts` format.

**Rendering rules:**

| Internal Part | Gemini Output |
|---|---|
| `TextPart` | `{ text }` |
| `ImagePart` (base64) | `{ inlineData: { mimeType, data } }` |
| `ImagePart` (URL) | `{ fileData: { mimeType, fileUri: url } }` |
| `AudioPart` | `{ inlineData: { mimeType, data } }` |
| `DocumentPart` (base64) | `{ inlineData: { mimeType, data } }` |
| `DocumentPart` (URL) | `{ fileData: { mimeType, fileUri: url } }` |
| `VideoPart` (URL) | `{ fileData: { mimeType, fileUri: url } }` |
| `VideoPart` (base64) | `{ inlineData: { mimeType, data } }` |

**Output type:**

```typescript
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}
```

**Role mapping:** Gemini uses `"model"` instead of `"assistant"`. The renderer maps `"assistant"` to `"model"` automatically.

**System messages:** Gemini does not support system messages in the `contents` array. When rendering a conversation, system messages are extracted and returned as a `systemInstruction` object (`{ parts: [{ text: "..." }] }`). When rendering a single message with `role: 'system'`, the renderer throws an error.

### Unsupported Content Behavior

When a content part type is not supported by the target provider, the behavior is determined by the `unsupportedBehavior` configuration:

| Mode | Behavior |
|---|---|
| `'error'` (default) | Throws an `UnsupportedContentError` with a message identifying the content type and provider. |
| `'skip'` | Silently omits the unsupported content part from the rendered output. The rendering result includes a `warnings` array documenting skipped parts. |
| `'placeholder'` | Replaces the unsupported content part with a text part: `{ type: "text", text: "[Unsupported: {type} content is not supported by {provider}]" }`. |

### File Path and Buffer Resolution

When a content source is a file path, the builder reads the file synchronously or asynchronously (depending on the rendering context) using `fs.readFileSync` or `fs.readFile`, converts the contents to base64, and stores the result in the internal representation. File reading happens at builder construction time (when `.image()`, `.audio()`, etc. are called), not at render time. This means the builder captures the file contents at construction time, and subsequent modifications to the file do not affect the rendered output.

When a content source is a Buffer, it is base64-encoded immediately and stored in the internal representation.

When a content source is a raw base64 string, it is stored as-is.

When a content source is a data URL, the prefix is parsed for MIME type information and the base64 payload is extracted and stored without the prefix.

---

## 9. Conversation Builder

### `conversation()`

Creates a new `ConversationBuilder` instance for constructing multi-turn conversations.

```typescript
import { conversation } from 'multimodal-msg';

const conv = conversation()
  .system('You are a helpful image analyst.')
  .user(u => u.text('What is in this image?').image(buffer))
  .assistant('I can see a landscape photograph showing mountains and a lake.')
  .user(u => u.text('What colors are prominent?'))
  .forOpenAI();
```

### `.system(content)`

Adds a system message to the conversation. Only one system message is allowed per conversation. Calling `.system()` multiple times replaces the previous system message.

```typescript
conversation()
  .system('You are a helpful assistant specialized in image analysis.')
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string` | Yes | The system message text |

### `.user(content)`

Adds a user message to the conversation. The `content` parameter can be a plain string (for text-only messages) or a callback function that receives a `MessageBuilder` for constructing multimodal messages.

```typescript
// Text-only
conversation().user('Hello, how are you?')

// Multimodal
conversation().user(u => u.text('Describe this').image(buffer))
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string \| ((builder: MessageBuilder) => void)` | Yes | Text string or builder callback |

### `.assistant(content)`

Adds an assistant message to the conversation. The `content` parameter can be a plain string or a callback function.

```typescript
// Text-only
conversation().assistant('The image shows a sunset over the ocean.')

// Multimodal (for models that return images)
conversation().assistant(a => a.text('Here is the modified image:').image(resultBuffer))
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string \| ((builder: MessageBuilder) => void)` | Yes | Text string or builder callback |

### `.for(provider)` / `.forOpenAI()` / `.forAnthropic()` / `.forGemini()`

Renders the full conversation for a target provider. Returns a `RenderedConversation` object that contains the messages array and, for providers that handle system messages separately, the extracted system message.

```typescript
const openai = conversation()
  .system('You are helpful.')
  .user('Hello')
  .forOpenAI();

// openai.messages = [
//   { role: 'system', content: 'You are helpful.' },
//   { role: 'user', content: 'Hello' },
// ]

const anthropic = conversation()
  .system('You are helpful.')
  .user('Hello')
  .forAnthropic();

// anthropic.system = 'You are helpful.'
// anthropic.messages = [
//   { role: 'user', content: 'Hello' },
// ]

const gemini = conversation()
  .system('You are helpful.')
  .user('Hello')
  .forGemini();

// gemini.systemInstruction = { parts: [{ text: 'You are helpful.' }] }
// gemini.contents = [
//   { role: 'user', parts: [{ text: 'Hello' }] },
// ]
```

---

## 10. API Surface

### Installation

```bash
npm install multimodal-msg
```

### No Peer Dependencies

`multimodal-msg` has zero runtime dependencies and zero peer dependencies. It uses only built-in Node.js APIs.

### Primary Exports

```typescript
import {
  msg,
  conversation,
  convertMessage,
  convertConversation,
} from 'multimodal-msg';
```

### `msg(role?)`

Creates a `MessageBuilder` instance.

```typescript
function msg(role?: 'user' | 'assistant' | 'system'): MessageBuilder;
```

Default role is `'user'`.

### `conversation()`

Creates a `ConversationBuilder` instance.

```typescript
function conversation(): ConversationBuilder;
```

### `convertMessage(message, fromProvider, toProvider)`

Converts an existing provider-specific message object to another provider's format.

```typescript
function convertMessage(
  message: Record<string, unknown>,
  fromProvider: Provider,
  toProvider: Provider,
  options?: ConvertOptions,
): Record<string, unknown>;
```

**Example:**

```typescript
import { convertMessage } from 'multimodal-msg';

// OpenAI message -> Anthropic message
const openaiMsg = {
  role: 'user',
  content: [
    { type: 'text', text: 'What is this?' },
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,/9j/4AAQ...' } },
  ],
};

const anthropicMsg = convertMessage(openaiMsg, 'openai', 'anthropic');
// {
//   role: 'user',
//   content: [
//     { type: 'text', text: 'What is this?' },
//     { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '/9j/4AAQ...' } },
//   ],
// }
```

**Conversion details:**

- OpenAI `image_url` with data URL: extracts MIME type and base64 data from the data URL, converts to Anthropic's `source` format or Gemini's `inlineData` format.
- OpenAI `image_url` with HTTPS URL: converts to Anthropic's `source: { type: "url" }` or Gemini's `fileData` format.
- Anthropic `source` with base64: wraps in data URL for OpenAI, converts to `inlineData` for Gemini.
- Anthropic `source` with URL: passes URL to OpenAI's `image_url.url` or Gemini's `fileData.fileUri`.
- Gemini `inlineData`: wraps in data URL for OpenAI, converts to Anthropic's `source` format.
- Gemini `fileData`: passes `fileUri` to OpenAI's `image_url.url` or Anthropic's `source: { type: "url" }`.
- Role mapping: `"assistant"` is converted to `"model"` for Gemini, `"model"` is converted to `"assistant"` for OpenAI and Anthropic.

### `convertConversation(conversation, fromProvider, toProvider)`

Converts a full conversation (including system message handling) between provider formats.

```typescript
function convertConversation(
  conversation: ConversationInput,
  fromProvider: Provider,
  toProvider: Provider,
  options?: ConvertOptions,
): RenderedConversation;
```

**`ConversationInput` structure:**

```typescript
// OpenAI-style: messages array with system role messages
interface OpenAIConversationInput {
  messages: Array<Record<string, unknown>>;
}

// Anthropic-style: separate system param + messages array
interface AnthropicConversationInput {
  system?: string;
  messages: Array<Record<string, unknown>>;
}

// Gemini-style: separate systemInstruction + contents array
interface GeminiConversationInput {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: Array<Record<string, unknown>>;
}

type ConversationInput = OpenAIConversationInput | AnthropicConversationInput | GeminiConversationInput;
```

**Example:**

```typescript
import { convertConversation } from 'multimodal-msg';

// Convert OpenAI conversation to Anthropic
const openaiConv = {
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ],
};

const anthropicConv = convertConversation(openaiConv, 'openai', 'anthropic');
// {
//   system: 'You are helpful.',
//   messages: [
//     { role: 'user', content: 'Hello' },
//     { role: 'assistant', content: 'Hi there!' },
//   ],
// }
```

### Type Definitions

```typescript
// ── Provider ────────────────────────────────────────────────────────

/** Supported LLM provider identifiers. */
type Provider = 'openai' | 'anthropic' | 'gemini';

// ── Content Parts (Internal) ────────────────────────────────────────

interface TextPart {
  type: 'text';
  text: string;
}

interface ImagePart {
  type: 'image';
  data: string;
  mimeType: string;
  sourceType: 'base64' | 'url';
  url?: string;
  detail?: 'low' | 'high' | 'auto';
  filename?: string;
}

interface AudioPart {
  type: 'audio';
  data: string;
  mimeType: string;
  format: string;
}

interface DocumentPart {
  type: 'document';
  data: string;
  mimeType: string;
  sourceType: 'base64' | 'url';
  url?: string;
  filename?: string;
}

interface VideoPart {
  type: 'video';
  data: string;
  mimeType: string;
  sourceType: 'base64' | 'url';
  url?: string;
}

type ContentPart = TextPart | ImagePart | AudioPart | DocumentPart | VideoPart;

// ── Internal Message ────────────────────────────────────────────────

interface InternalMessage {
  role: 'user' | 'assistant' | 'system';
  parts: ContentPart[];
}

// ── Builder Interfaces ──────────────────────────────────────────────

interface MessageBuilder {
  text(content: string): MessageBuilder;
  image(source: ContentSource, options?: ImageOptions): MessageBuilder;
  audio(source: ContentSource, options?: AudioOptions): MessageBuilder;
  document(source: ContentSource, options?: DocumentOptions): MessageBuilder;
  video(source: ContentSource, options?: VideoOptions): MessageBuilder;
  for(provider: Provider): RenderedMessage;
  forOpenAI(options?: OpenAIRenderOptions): OpenAIMessage;
  forAnthropic(): AnthropicMessage;
  forGemini(): GeminiContent;
  toJSON(): InternalMessage;
}

interface ConversationBuilder {
  system(content: string): ConversationBuilder;
  user(content: string | ((builder: MessageBuilder) => void)): ConversationBuilder;
  assistant(content: string | ((builder: MessageBuilder) => void)): ConversationBuilder;
  for(provider: Provider): RenderedConversation;
  forOpenAI(options?: OpenAIRenderOptions): OpenAIRenderedConversation;
  forAnthropic(): AnthropicRenderedConversation;
  forGemini(): GeminiRenderedConversation;
  toJSON(): InternalConversation;
}

// ── Content Source ──────────────────────────────────────────────────

/** Input source for binary content: Buffer, base64 string, URL, or file path. */
type ContentSource = Buffer | Uint8Array | string;

// ── Options ─────────────────────────────────────────────────────────

interface ImageOptions {
  /** MIME type. Auto-detected if not specified. */
  mimeType?: string;
  /** OpenAI detail mode. */
  detail?: 'low' | 'high' | 'auto';
  /** Filename hint. */
  filename?: string;
}

interface AudioOptions {
  /** MIME type. Auto-detected if not specified. */
  mimeType?: string;
  /** Audio format identifier for OpenAI. Inferred from mimeType if not specified. */
  format?: 'wav' | 'mp3' | 'ogg' | 'flac' | 'webm';
}

interface DocumentOptions {
  /** MIME type. Auto-detected if not specified. */
  mimeType?: string;
  /** Filename for the document. */
  filename?: string;
}

interface VideoOptions {
  /** MIME type. Required for URL sources. Auto-detected for others. */
  mimeType?: string;
}

interface OpenAIRenderOptions {
  /** Default detail level for images. Default: 'auto'. */
  detail?: 'low' | 'high' | 'auto';
  /** Whether to use compact string format for text-only messages. Default: false. */
  compactText?: boolean;
  /** System message role. Default: 'system'. */
  systemRole?: 'system' | 'developer';
}

interface ConvertOptions {
  /** Behavior when a content type is not supported by the target provider.
   *  Default: 'error'. */
  unsupportedBehavior?: 'error' | 'skip' | 'placeholder';
}

// ── Rendered Output ─────────────────────────────────────────────────

type RenderedMessage = OpenAIMessage | AnthropicMessage | GeminiContent;

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string | Array<Record<string, unknown>>;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<Record<string, unknown>>;
}

// ── Rendered Conversation ───────────────────────────────────────────

type RenderedConversation =
  | OpenAIRenderedConversation
  | AnthropicRenderedConversation
  | GeminiRenderedConversation;

interface OpenAIRenderedConversation {
  messages: OpenAIMessage[];
}

interface AnthropicRenderedConversation {
  system?: string;
  messages: AnthropicMessage[];
}

interface GeminiRenderedConversation {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
}

interface InternalConversation {
  system?: string;
  messages: InternalMessage[];
}

// ── Warnings ────────────────────────────────────────────────────────

interface RenderWarning {
  /** Type of warning. */
  type: 'unsupported_content' | 'mime_type_inferred' | 'format_inferred';
  /** Human-readable message. */
  message: string;
  /** Index of the affected content part. */
  partIndex?: number;
}
```

### Type Exports

```typescript
export type {
  Provider,
  ContentPart,
  TextPart,
  ImagePart,
  AudioPart,
  DocumentPart,
  VideoPart,
  ContentSource,
  InternalMessage,
  InternalConversation,
  MessageBuilder,
  ConversationBuilder,
  ImageOptions,
  AudioOptions,
  DocumentOptions,
  VideoOptions,
  OpenAIRenderOptions,
  ConvertOptions,
  OpenAIMessage,
  AnthropicMessage,
  GeminiContent,
  RenderedMessage,
  RenderedConversation,
  OpenAIRenderedConversation,
  AnthropicRenderedConversation,
  GeminiRenderedConversation,
  RenderWarning,
};
```

---

## 11. Image Handling

### Input Sources

The `.image()` method accepts four input types, each handled differently:

**Buffer / Uint8Array:**

The Buffer is base64-encoded immediately using `buffer.toString('base64')`. The MIME type is auto-detected from magic bytes if not provided.

**File path:**

The file is read using `fs.readFileSync(path)`, then treated as a Buffer. The MIME type is auto-detected from magic bytes or inferred from the file extension.

**Base64 string (raw):**

Stored as-is. The MIME type must be provided via `options.mimeType` or will be inferred from the first few decoded bytes if possible.

**Base64 data URL:**

The prefix is parsed to extract the MIME type (e.g., `data:image/jpeg;base64,` yields `'image/jpeg'`). The base64 payload after the comma is extracted and stored without the prefix.

**URL (http/https):**

The URL is stored as a URL reference, not fetched. The MIME type can be inferred from the URL path extension (`.jpg` -> `image/jpeg`) or must be provided via `options.mimeType`. The URL is passed through to providers that support URL-based images. If the target provider does not support URL-based images, an error is thrown.

### MIME Type Auto-Detection

When `mimeType` is not provided, the package detects it using the following strategies, in order:

1. **Data URL prefix:** Parse `data:image/jpeg;base64,...` to extract `image/jpeg`.
2. **Magic bytes (Buffer):** Read the first 8 bytes to identify the image format:

   | Bytes (hex) | Format | MIME Type |
   |---|---|---|
   | `FF D8 FF` | JPEG | `image/jpeg` |
   | `89 50 4E 47` | PNG | `image/png` |
   | `47 49 46 38` | GIF | `image/gif` |
   | `52 49 46 46` ... `57 45 42 50` | WebP | `image/webp` |
   | `42 4D` | BMP | `image/bmp` |

3. **File extension (file path or URL):**

   | Extension | MIME Type |
   |---|---|
   | `.jpg`, `.jpeg` | `image/jpeg` |
   | `.png` | `image/png` |
   | `.gif` | `image/gif` |
   | `.webp` | `image/webp` |
   | `.bmp` | `image/bmp` |
   | `.svg` | `image/svg+xml` |

4. **Default:** If no detection strategy succeeds, the builder throws a `MimeTypeDetectionError` requiring the caller to specify the MIME type explicitly.

### Integration with vision-prep

`vision-prep` prepares images (resizes, compresses, estimates tokens) and returns a `PreparedImage` object with `base64`, `mimeType`, and `contentBlock` fields. `multimodal-msg` can consume `vision-prep`'s output directly:

```typescript
import { prepare } from 'vision-prep';
import { msg } from 'multimodal-msg';

const prepared = await prepare('./photo.jpg', 'openai', { detail: 'high' });

// Option 1: Use vision-prep's base64 output with multimodal-msg
const message = msg('user')
  .text('What is in this image?')
  .image(prepared.base64, { mimeType: prepared.mimeType })
  .forOpenAI({ detail: 'high' });

// Option 2: Use vision-prep's contentBlock directly (bypass multimodal-msg for images)
const directMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    prepared.contentBlock,
  ],
};
```

When used together, the recommended pattern is to use `vision-prep` for image preparation and token estimation, then feed the prepared base64 data into `multimodal-msg` for the provider-specific message wrapping. This gives the developer both optimized images and correct message formatting.

---

## 12. Conversation Builder Details

### System Message Extraction

The `ConversationBuilder` handles the fundamental system message difference between providers. The system message is stored as a plain string internally and is placed differently during rendering:

**OpenAI rendering:**

```typescript
const result = conversation()
  .system('You are a helpful assistant.')
  .user('Hello')
  .forOpenAI();

// result.messages = [
//   { role: 'system', content: 'You are a helpful assistant.' },
//   { role: 'user', content: 'Hello' },
// ]
```

The system message is inserted as the first message in the array with `role: 'system'`.

**Anthropic rendering:**

```typescript
const result = conversation()
  .system('You are a helpful assistant.')
  .user('Hello')
  .forAnthropic();

// result.system = 'You are a helpful assistant.'
// result.messages = [
//   { role: 'user', content: 'Hello' },
// ]
```

The system message is extracted to a separate `system` field. The messages array contains only user and assistant messages.

**Gemini rendering:**

```typescript
const result = conversation()
  .system('You are a helpful assistant.')
  .user('Hello')
  .forGemini();

// result.systemInstruction = { parts: [{ text: 'You are a helpful assistant.' }] }
// result.contents = [
//   { role: 'user', parts: [{ text: 'Hello' }] },
// ]
```

The system message is extracted to a `systemInstruction` object in Gemini's expected format. The contents array contains only user and model messages.

### Multimodal Conversation Messages

User and assistant messages in a conversation can be multimodal. The callback form of `.user()` and `.assistant()` provides a `MessageBuilder` for constructing multimodal content:

```typescript
const conv = conversation()
  .system('You are a vision expert.')
  .user(u => u
    .text('Compare these two images:')
    .image(image1Buffer, { mimeType: 'image/jpeg' })
    .image(image2Buffer, { mimeType: 'image/png' })
    .text('Which has better composition?')
  )
  .assistant('The first image has better composition because...')
  .user('Can you elaborate on the rule of thirds?')
  .forAnthropic();
```

### No System Message

When no system message is set, the rendered output simply omits the system-related field:

```typescript
const result = conversation()
  .user('Hello')
  .forAnthropic();

// result.system = undefined
// result.messages = [{ role: 'user', content: 'Hello' }]
```

### Message Ordering

Messages are rendered in the order they are added. The builder does not reorder messages, enforce alternation between user and assistant messages, or validate turn-taking rules. These constraints vary by provider (Anthropic requires strict user/assistant alternation; OpenAI and Gemini are more lenient) and are the caller's responsibility.

---

## 13. Configuration

### Global Defaults

`multimodal-msg` exports a `configure` function for setting global defaults that apply to all subsequent builder instances:

```typescript
import { configure } from 'multimodal-msg';

configure({
  defaultProvider: 'openai',
  unsupportedBehavior: 'skip',
  openai: {
    detail: 'high',
    compactText: false,
    systemRole: 'system',
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultProvider` | `Provider` | `undefined` | Default provider for `.for()` when no argument is given. When set, `msg().text('Hi').for()` renders for this provider. |
| `unsupportedBehavior` | `'error' \| 'skip' \| 'placeholder'` | `'error'` | Behavior when a content type is not supported by the target provider. |
| `openai.detail` | `'low' \| 'high' \| 'auto'` | `'auto'` | Default OpenAI image detail level. |
| `openai.compactText` | `boolean` | `false` | Use plain string content for text-only messages on OpenAI. |
| `openai.systemRole` | `'system' \| 'developer'` | `'system'` | Role used for system messages in OpenAI format. |

### No Configuration Files

All configuration is via the `configure()` function call. No environment variables, no configuration files, no initialization steps beyond importing and calling. Configuration is optional -- the package works without any configuration using sensible defaults.

---

## 14. CLI

### Binary Name

`multimodal-msg`

### Installation and Invocation

```bash
# Global install
npm install -g multimodal-msg
multimodal-msg convert openai anthropic message.json

# npx (no install)
npx multimodal-msg convert openai anthropic message.json
```

### Commands

#### `multimodal-msg convert <from> <to> [input]`

Converts a message or conversation JSON from one provider's format to another.

```
Arguments:
  <from>                     Source provider: openai, anthropic, gemini
  <to>                       Target provider: openai, anthropic, gemini
  [input]                    Path to JSON file or '-' for stdin. Default: stdin

Options:
  --conversation             Treat input as a full conversation (with system message handling)
  --unsupported <behavior>   Handle unsupported content: error, skip, placeholder. Default: error
  --pretty                   Pretty-print JSON output. Default: false
  --output <path>            Write output to file instead of stdout

Meta:
  --version                  Print version and exit
  --help                     Print help and exit
```

### Usage Examples

```bash
# Convert a single OpenAI message to Anthropic format
echo '{"role":"user","content":[{"type":"text","text":"Hello"},{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,/9j/..."}}]}' \
  | multimodal-msg convert openai anthropic --pretty

# Convert a full OpenAI conversation to Gemini format
multimodal-msg convert openai gemini --conversation conversation.json --pretty

# Convert Anthropic to OpenAI, skipping unsupported content types
multimodal-msg convert anthropic openai input.json --unsupported skip --output output.json
```

### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success. Conversion completed. |
| `1` | Conversion error. Unsupported content type (when `--unsupported` is `error`), invalid input JSON, or conversion failure. |
| `2` | Configuration error. Invalid flags, missing arguments, unsupported provider. |

---

## 15. Integration with Monorepo Packages

### Integration with vision-prep

`vision-prep` prepares images for LLM consumption: resizing, compression, base64 encoding, and token estimation. `multimodal-msg` takes `vision-prep`'s output (base64 data and MIME type) and wraps it in the correct provider-specific content block format. The two packages are complementary: `vision-prep` handles the image preparation layer, `multimodal-msg` handles the message formatting layer.

```typescript
import { prepare } from 'vision-prep';
import { msg } from 'multimodal-msg';

const image = await prepare('./photo.jpg', 'openai', { detail: 'high' });

const message = msg('user')
  .text('Analyze this image.')
  .image(image.base64, { mimeType: image.mimeType, detail: 'high' })
  .forOpenAI();

// message is ready to pass to openai.chat.completions.create()
```

### Integration with audio-chunker

`audio-chunker` splits audio streams into provider-compatible segments. `multimodal-msg` takes the chunked audio segments and wraps each in the correct provider-specific audio content format.

```typescript
import { chunk } from 'audio-chunker';
import { msg } from 'multimodal-msg';

const chunks = await chunk('./long-recording.wav', { maxDurationMs: 60_000 });

const message = msg('user')
  .text('Transcribe this audio recording:');

for (const audioChunk of chunks) {
  message.audio(audioChunk.buffer, { mimeType: 'audio/wav', format: 'wav' });
}

const rendered = message.forOpenAI();
```

### Integration with schema-bridge

`schema-bridge` converts tool schemas across providers. `multimodal-msg` converts message content across providers. Together, they enable a complete provider-agnostic LLM integration: `schema-bridge` for the tool definition layer, `multimodal-msg` for the message content layer.

```typescript
import { bridgeTools } from 'schema-bridge';
import { conversation } from 'multimodal-msg';

const provider = getUserSelectedProvider(); // 'openai' | 'anthropic' | 'gemini'

// Convert tools
const { tools } = bridgeTools(myTools, provider);

// Build conversation
const conv = conversation()
  .system('You are a helpful assistant with access to tools.')
  .user(u => u.text('What is the weather?').image(screenshotBuffer))
  .for(provider);

// Both tools and messages are now in the correct format for the selected provider
```

### Integration with prompt-price

`prompt-price` estimates the total cost of an LLM request. `multimodal-msg` constructs the message, and the rendered output can be passed to `prompt-price` for cost estimation.

```typescript
import { msg } from 'multimodal-msg';
import { estimate } from 'prompt-price';

const message = msg('user')
  .text('What is in this image?')
  .image(buffer, { mimeType: 'image/jpeg' })
  .forOpenAI();

const cost = await estimate([message], 'openai/gpt-4o');
```

---

## 16. Testing Strategy

### Unit Tests

**Message builder tests:**

- `msg()` creates a builder with default role `'user'`.
- `msg('assistant')` creates a builder with role `'assistant'`.
- `.text()` adds a text part.
- Multiple `.text()` calls add multiple text parts.
- `.image()` with Buffer adds an image part with base64-encoded data.
- `.image()` with data URL parses MIME type and strips prefix.
- `.image()` with HTTPS URL stores as URL reference.
- `.image()` with file path reads file and base64-encodes (requires test fixture).
- `.image()` with raw base64 stores as-is.
- `.audio()` adds an audio part with correct format derivation.
- `.document()` adds a document part.
- `.video()` adds a video part.
- `.toJSON()` returns the internal representation.
- Method chaining works: `msg().text('a').image(buf).text('b')` preserves order.

**MIME type detection tests:**

- JPEG magic bytes detected as `image/jpeg`.
- PNG magic bytes detected as `image/png`.
- GIF magic bytes detected as `image/gif`.
- WebP magic bytes detected as `image/webp`.
- BMP magic bytes detected as `image/bmp`.
- WAV magic bytes detected as `audio/wav`.
- PDF magic bytes detected as `application/pdf`.
- Data URL prefix parsed correctly for all MIME types.
- File extension fallback works for `.jpg`, `.png`, `.gif`, `.webp`, `.mp3`, `.wav`, `.pdf`, `.mp4`.
- Missing MIME type throws `MimeTypeDetectionError`.

**OpenAI rendering tests:**

- Text-only message renders as `{ role, content: [{ type: "text", text }] }`.
- Text-only with `compactText: true` renders as `{ role, content: "text" }`.
- Image (base64) renders with data URL prefix in `image_url.url`.
- Image (URL) renders with URL in `image_url.url`.
- Image detail mode is included in rendered output.
- Audio renders as `{ type: "input_audio", input_audio: { data, format } }`.
- Document renders as `{ type: "file", file: { filename, file_data } }` with data URL encoding.
- Unsupported content type (video) triggers configured behavior.
- System message renders with configured `systemRole`.

**Anthropic rendering tests:**

- Text-only message renders correctly.
- Image (base64) renders with raw base64 in `source.data` and `source.type: "base64"`.
- Image (URL) renders with `source.type: "url"`.
- Document renders as `{ type: "document", source: { ... } }`.
- Audio throws `UnsupportedContentError` by default.
- Audio skipped silently with `unsupportedBehavior: 'skip'`.
- System role message throws error (system messages handled at conversation level).

**Gemini rendering tests:**

- Text renders as `{ text }` without type discriminator.
- Image (base64) renders as `{ inlineData: { mimeType, data } }`.
- Image (URL) renders as `{ fileData: { mimeType, fileUri } }`.
- Audio renders as `{ inlineData: { mimeType, data } }`.
- Video (URL) renders as `{ fileData: { mimeType, fileUri } }`.
- Role `'assistant'` mapped to `'model'`.
- Content array uses `parts` not `content`.

**Conversation builder tests:**

- `.system()` sets system message.
- Multiple `.system()` calls replace previous system message.
- `.user()` with string adds text-only user message.
- `.user()` with callback adds multimodal user message.
- `.assistant()` with string adds text-only assistant message.
- Message order is preserved.
- OpenAI rendering includes system message as first message.
- Anthropic rendering extracts system to separate field.
- Gemini rendering extracts system to `systemInstruction`.
- No system message produces no system field in output.

**Conversion tests:**

- OpenAI image (data URL) to Anthropic (raw base64 + media_type).
- OpenAI image (URL) to Anthropic (source.type: "url").
- Anthropic image (base64) to OpenAI (data URL).
- Anthropic image (URL) to OpenAI (image_url.url).
- OpenAI to Gemini (inlineData/fileData).
- Gemini to OpenAI.
- Anthropic to Gemini.
- Gemini to Anthropic.
- Role mapping: `assistant` to `model` (Gemini), `model` to `assistant` (others).
- System message extraction during conversation conversion.
- System message injection during conversation conversion.
- Text-only messages convert correctly.
- Multi-part messages convert correctly.
- Unsupported content types handled per configuration.

### Edge Cases

- Message with zero content parts (empty message).
- Message with only unsupported content parts for the target provider.
- Image with MIME type not matching magic bytes (trust explicit MIME type).
- Very large base64 string (memory handling, no truncation).
- Mixed content types: text + image + audio + document in one message.
- URL containing query parameters and fragments.
- File path with spaces and special characters.
- Data URL with charset parameter (`data:image/jpeg;charset=utf-8;base64,...`).
- Conversion roundtrip: OpenAI -> Anthropic -> OpenAI produces equivalent output.
- Conversation with no messages (only system).
- Conversation with no system message.

### Test Framework

Tests use Vitest, matching the project's existing configuration. Test fixtures include small valid binary files (minimal JPEG, PNG, WAV, PDF headers with minimal data) in `src/__tests__/fixtures/`.

---

## 17. Performance

### Rendering Speed

Message rendering is a synchronous, in-memory operation: iterating over content parts, looking up the provider's format, and constructing new objects. No I/O, no async operations, no external calls. Expected rendering times:

| Message Complexity | Expected Time |
|---|---|
| Text-only (1 part) | < 0.01 ms |
| Text + 1 image (2 parts) | < 0.05 ms |
| Text + 5 images (6 parts) | < 0.1 ms |
| Mixed multimodal (10 parts, all types) | < 0.2 ms |

### Conversion Speed

Message conversion involves parsing the source format, creating internal parts, and rendering for the target provider. Expected conversion times:

| Message Complexity | Expected Time |
|---|---|
| Text-only | < 0.02 ms |
| Multimodal (5 parts) | < 0.1 ms |
| Full conversation (20 messages, mixed content) | < 1 ms |

### Memory

The primary memory cost is base64 data. A 1 MB image produces approximately 1.37 MB of base64 string data. The builder stores one copy of the base64 data in the internal representation; rendering creates a second copy in the provider-specific format. Peak memory per message is approximately `2 * sum(base64_sizes_of_all_parts)`. For a message with five 1 MB images, peak memory is approximately 14 MB (5 * 1.37 MB * 2).

The builder does not cache rendered outputs. Each call to `.for()`, `.forOpenAI()`, etc. produces a new object. If the caller needs the same message in multiple provider formats, the builder is reusable: call `.forOpenAI()` and `.forAnthropic()` on the same builder instance without rebuilding.

### File I/O

File reading (for file path sources) is synchronous (`fs.readFileSync`) and occurs at builder construction time. For large files or high-throughput scenarios, callers should read files asynchronously and pass Buffers to the builder instead of file paths. An async variant of the builder (`.imageAsync()`, `.audioAsync()`) is not provided to keep the API surface small -- the caller controls async I/O.

---

## 18. Error Handling

### Error Classes

```typescript
/** Content type not supported by the target provider. */
class UnsupportedContentError extends Error {
  contentType: string;   // 'audio', 'video', etc.
  provider: Provider;    // 'openai', 'anthropic', 'gemini'
}

/** MIME type could not be detected from the input source. */
class MimeTypeDetectionError extends Error {
  source: string;        // description of the source that failed detection
}

/** File path does not exist or is not readable. */
class FileReadError extends Error {
  filePath: string;
}

/** Invalid provider string. */
class InvalidProviderError extends Error {
  provider: string;
}

/** Invalid message structure during conversion. */
class ConversionError extends Error {
  fromProvider: Provider;
  toProvider: Provider;
  detail: string;
}
```

### Error Conditions

| Condition | Error | When |
|---|---|---|
| Audio part rendered for Anthropic | `UnsupportedContentError` | `unsupportedBehavior: 'error'` |
| Video part rendered for OpenAI or Anthropic | `UnsupportedContentError` | `unsupportedBehavior: 'error'` |
| MIME type not detectable | `MimeTypeDetectionError` | No magic bytes match, no file extension, no explicit MIME type |
| File path not found | `FileReadError` | `fs.readFileSync` throws `ENOENT` |
| Invalid provider string | `InvalidProviderError` | Provider is not `'openai'`, `'anthropic'`, or `'gemini'` |
| System role message rendered as single message | `Error` | Anthropic and Gemini do not support system role in messages |
| Malformed provider message during conversion | `ConversionError` | Input message structure does not match expected provider format |

---

## 19. Dependencies

### Runtime Dependencies

None. The core builder and rendering logic uses only built-in JavaScript and Node.js APIs:

- `Buffer.from()` / `Buffer.toString('base64')` for base64 encoding/decoding
- `fs.readFileSync()` for file path reading
- `path.extname()` for file extension extraction
- `Object.keys()`, `Array.isArray()`, spread syntax for object construction

### Peer Dependencies

None. The package is fully self-contained.

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler |
| `vitest` | Test runner |
| `eslint` | Linter |

---

## 20. File Structure

```
multimodal-msg/
├── src/
│   ├── index.ts                    # Public API exports: msg, conversation, convertMessage, convertConversation, configure
│   ├── builder.ts                  # MessageBuilder implementation
│   ├── conversation-builder.ts     # ConversationBuilder implementation
│   ├── convert.ts                  # convertMessage() and convertConversation()
│   ├── configure.ts                # Global configuration
│   ├── types.ts                    # All TypeScript type definitions
│   ├── detect.ts                   # Source type detection (URL, file, base64, data URL) and MIME type detection
│   ├── encode.ts                   # Base64 encoding, data URL construction/parsing, file reading
│   ├── renderers/
│   │   ├── index.ts                # Renderer registry and dispatch
│   │   ├── openai.ts               # OpenAI message renderer
│   │   ├── anthropic.ts            # Anthropic message renderer
│   │   └── gemini.ts               # Gemini content renderer
│   ├── parsers/
│   │   ├── index.ts                # Parser registry and dispatch
│   │   ├── openai.ts               # Parse OpenAI message to internal representation
│   │   ├── anthropic.ts            # Parse Anthropic message to internal representation
│   │   └── gemini.ts               # Parse Gemini content to internal representation
│   ├── errors.ts                   # Error classes
│   ├── cli.ts                      # CLI entry point
│   └── __tests__/
│       ├── builder.test.ts         # MessageBuilder unit tests
│       ├── conversation.test.ts    # ConversationBuilder unit tests
│       ├── detect.test.ts          # Source and MIME type detection tests
│       ├── encode.test.ts          # Encoding and data URL parsing tests
│       ├── convert.test.ts         # Message and conversation conversion tests
│       ├── renderers/
│       │   ├── openai.test.ts      # OpenAI renderer tests
│       │   ├── anthropic.test.ts   # Anthropic renderer tests
│       │   └── gemini.test.ts      # Gemini renderer tests
│       ├── parsers/
│       │   ├── openai.test.ts      # OpenAI parser tests
│       │   ├── anthropic.test.ts   # Anthropic parser tests
│       │   └── gemini.test.ts      # Gemini parser tests
│       ├── cli.test.ts             # CLI integration tests
│       └── fixtures/
│           ├── tiny.jpg            # Minimal valid JPEG (smallest possible)
│           ├── tiny.png            # Minimal valid PNG
│           ├── tiny.wav            # Minimal valid WAV header
│           ├── tiny.pdf            # Minimal valid PDF
│           └── tiny.mp4            # Minimal valid MP4
├── package.json
├── tsconfig.json
├── SPEC.md
└── README.md
```

---

## 21. Implementation Roadmap

### Phase 1: Core Infrastructure (v0.1.0)

1. **Types and errors** -- Define all TypeScript interfaces (`ContentPart`, `InternalMessage`, `MessageBuilder`, `ConversationBuilder`, `RenderedMessage`, `RenderedConversation`, `Provider`, all option types) and error classes (`UnsupportedContentError`, `MimeTypeDetectionError`, `FileReadError`, `InvalidProviderError`, `ConversionError`).
2. **Source detection** -- Implement `detect.ts` with source type detection (URL, file path, data URL, raw base64) and MIME type detection (magic bytes, file extension, data URL parsing).
3. **Encoding utilities** -- Implement `encode.ts` with base64 encoding, data URL construction (`data:{mimeType};base64,{data}`), data URL parsing (extract MIME type and payload), and file reading.
4. **Message builder** -- Implement `builder.ts` with the `MessageBuilder` class: `.text()`, `.image()`, `.audio()`, `.document()`, `.video()`, `.toJSON()`, and the rendering dispatch methods (`.for()`, `.forOpenAI()`, `.forAnthropic()`, `.forGemini()`).
5. **Provider renderers** -- Implement the three renderers:
   - `renderers/openai.ts`: convert internal parts to OpenAI content format, handle data URL encoding, image detail, audio format, document file format.
   - `renderers/anthropic.ts`: convert internal parts to Anthropic content format, handle raw base64 encoding, source type discrimination, unsupported content handling.
   - `renderers/gemini.ts`: convert internal parts to Gemini parts format, handle `inlineData`/`fileData` discrimination, role mapping.
6. **Unit tests** -- Write tests for detection, encoding, builder, and all three renderers.

### Phase 2: Conversation Builder (v0.2.0)

7. **Conversation builder** -- Implement `conversation-builder.ts` with the `ConversationBuilder` class: `.system()`, `.user()`, `.assistant()`, rendering methods with system message extraction for Anthropic and Gemini.
8. **Conversation rendering tests** -- Test system message placement for all three providers, multimodal messages in conversations, and edge cases (no system message, system-only conversation).

### Phase 3: Format Conversion (v0.3.0)

9. **Provider parsers** -- Implement the three parsers that parse provider-specific message objects back to internal representation:
   - `parsers/openai.ts`: parse OpenAI content arrays, extract base64 from data URLs, detect URL vs base64 images.
   - `parsers/anthropic.ts`: parse Anthropic content arrays, handle source type discrimination.
   - `parsers/gemini.ts`: parse Gemini parts arrays, handle `inlineData` vs `fileData`.
10. **convertMessage** -- Implement `convert.ts` with `convertMessage()`: parse source message, render to target format.
11. **convertConversation** -- Implement `convertConversation()`: parse source conversation (including system message extraction), convert each message, render to target format with system message placement.
12. **Conversion tests** -- Test all 6 provider-to-provider conversion paths (3 * 2), system message handling, and edge cases.

### Phase 4: CLI and Configuration (v0.4.0)

13. **Configuration** -- Implement `configure.ts` with global defaults.
14. **CLI** -- Implement `cli.ts` with the `convert` command, stdin/file input, JSON output, and exit codes.
15. **CLI tests** -- Test CLI with subprocess execution.

### Phase 5: Polish (v0.5.0)

16. **Conversion roundtrip tests** -- Verify that A -> B -> A produces equivalent output for all provider pairs.
17. **Documentation** -- Write README with usage examples, API reference, and provider comparison table.
18. **Edge case hardening** -- Handle all edge cases enumerated in the testing strategy.

---

## 22. Example Use Cases

### 22.1 Multi-Provider Image Analysis

An application sends the same image to multiple providers to compare analysis results:

```typescript
import { msg } from 'multimodal-msg';
import { prepare } from 'vision-prep';

const image = await prepare('./photo.jpg', 'openai');
const imageData = image.base64;
const mimeType = image.mimeType;

const builder = msg('user')
  .text('Describe what you see in this image. Be specific about colors, objects, and spatial relationships.')
  .image(imageData, { mimeType });

// Same message content, three different formats
const openaiMsg = builder.forOpenAI({ detail: 'high' });
const anthropicMsg = builder.forAnthropic();
const geminiMsg = builder.forGemini();

// Send to each provider via their respective SDKs
const [openaiResult, anthropicResult, geminiResult] = await Promise.all([
  openai.chat.completions.create({ model: 'gpt-4o', messages: [openaiMsg] }),
  anthropic.messages.create({ model: 'claude-sonnet-4-5-20250514', messages: [anthropicMsg], max_tokens: 1024 }),
  gemini.generateContent({ contents: [geminiMsg] }),
]);
```

### 22.2 Provider Migration

A team migrating from OpenAI to Anthropic needs to convert existing message construction code. They have hundreds of message objects stored in a database in OpenAI format:

```typescript
import { convertConversation } from 'multimodal-msg';

// Load existing OpenAI-formatted conversations from database
const storedConversations = await db.getConversations();

for (const conv of storedConversations) {
  const anthropicConv = convertConversation(
    { messages: conv.messages },
    'openai',
    'anthropic',
    { unsupportedBehavior: 'skip' }
  );

  // anthropicConv.system contains the extracted system message
  // anthropicConv.messages contains converted user/assistant messages
  // Images converted from data URL to raw base64 with media_type

  await db.saveAnthropicConversation(conv.id, anthropicConv);
}
```

### 22.3 Multimodal Chatbot

A chatbot accepts user uploads (images, PDFs) and forwards them to an LLM:

```typescript
import { conversation } from 'multimodal-msg';

const provider = config.llmProvider; // 'openai' | 'anthropic' | 'gemini'

app.post('/chat', async (req, res) => {
  const { text, attachments, history } = req.body;

  const conv = conversation()
    .system('You are a helpful assistant. Analyze any images or documents the user sends.');

  // Replay conversation history
  for (const turn of history) {
    if (turn.role === 'user') {
      conv.user(turn.text);
    } else {
      conv.assistant(turn.text);
    }
  }

  // Add current user message with attachments
  conv.user(u => {
    u.text(text);
    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        u.image(attachment.buffer, { mimeType: attachment.type });
      } else if (attachment.type === 'application/pdf') {
        u.document(attachment.buffer, {
          mimeType: attachment.type,
          filename: attachment.name,
        });
      }
    }
  });

  const rendered = conv.for(provider);
  // Pass rendered conversation to the selected provider's SDK
});
```

### 22.4 Audio Transcription Across Providers

An application sends audio content to providers that support it, with a fallback text message for providers that do not:

```typescript
import { msg } from 'multimodal-msg';

const audioBuffer = await fs.readFile('./recording.wav');

const builder = msg('user')
  .text('Transcribe the following audio recording.')
  .audio(audioBuffer, { mimeType: 'audio/wav', format: 'wav' });

// Works for OpenAI and Gemini (audio supported)
const openaiMsg = builder.forOpenAI();
const geminiMsg = builder.forGemini();

// For Anthropic, configure to replace unsupported audio with placeholder
import { configure } from 'multimodal-msg';
configure({ unsupportedBehavior: 'placeholder' });

const anthropicMsg = builder.forAnthropic();
// Audio part is replaced with: { type: "text", text: "[Unsupported: audio content is not supported by anthropic]" }
```

### 22.5 Conversation Format Conversion for Logging

A logging system needs to store conversations in a provider-agnostic format and convert them for replay on any provider:

```typescript
import { conversation, convertConversation } from 'multimodal-msg';

// Build conversation using the builder (provider-agnostic)
const conv = conversation()
  .system('You are a code reviewer.')
  .user(u => u.text('Review this screenshot:').image(screenshotBuffer))
  .assistant('I can see a React component with...')
  .user('Any performance concerns?');

// Store in provider-agnostic JSON format
const agnosticJson = conv.toJSON();
await db.saveConversation(agnosticJson);

// Later, replay for any provider
const storedConv = await db.loadConversation(conversationId);
const openaiReplay = convertConversation(storedConv, 'internal', 'openai');
const anthropicReplay = convertConversation(storedConv, 'internal', 'anthropic');
```
