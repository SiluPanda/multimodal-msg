# multimodal-msg -- Task Breakdown

## Phase 1: Core Infrastructure (v0.1.0)

### 1.1 Project Setup and Scaffolding

- [ ] **Install dev dependencies** -- Add `typescript`, `vitest`, and `eslint` as dev dependencies in `package.json`. Run `npm install` to generate `node_modules` and `package-lock.json`. | Status: not_done
- [ ] **Add `bin` entry to package.json** -- Add `"bin": { "multimodal-msg": "dist/cli.js" }` to `package.json` for CLI support. | Status: not_done
- [ ] **Create test fixtures directory** -- Create `src/__tests__/fixtures/` directory and generate minimal valid binary files: `tiny.jpg` (smallest valid JPEG), `tiny.png` (smallest valid PNG), `tiny.wav` (minimal valid WAV header), `tiny.pdf` (minimal valid PDF), and `tiny.mp4` (minimal valid MP4). These are used by MIME type detection and file-reading tests. | Status: not_done

### 1.2 Type Definitions (`src/types.ts`)

- [ ] **Define Provider type** -- `type Provider = 'openai' | 'anthropic' | 'gemini'`. | Status: not_done
- [ ] **Define ContentSource type** -- `type ContentSource = Buffer | Uint8Array | string`. | Status: not_done
- [ ] **Define TextPart interface** -- `{ type: 'text'; text: string }`. | Status: not_done
- [ ] **Define ImagePart interface** -- `{ type: 'image'; data: string; mimeType: string; sourceType: 'base64' | 'url'; url?: string; detail?: 'low' | 'high' | 'auto'; filename?: string }`. | Status: not_done
- [ ] **Define AudioPart interface** -- `{ type: 'audio'; data: string; mimeType: string; format: string }`. | Status: not_done
- [ ] **Define DocumentPart interface** -- `{ type: 'document'; data: string; mimeType: string; sourceType: 'base64' | 'url'; url?: string; filename?: string }`. | Status: not_done
- [ ] **Define VideoPart interface** -- `{ type: 'video'; data: string; mimeType: string; sourceType: 'base64' | 'url'; url?: string }`. | Status: not_done
- [ ] **Define ContentPart union type** -- `type ContentPart = TextPart | ImagePart | AudioPart | DocumentPart | VideoPart`. | Status: not_done
- [ ] **Define InternalMessage interface** -- `{ role: 'user' | 'assistant' | 'system'; parts: ContentPart[] }`. | Status: not_done
- [ ] **Define InternalConversation interface** -- `{ system?: string; messages: InternalMessage[] }`. | Status: not_done
- [ ] **Define MessageBuilder interface** -- Fluent builder interface with `.text()`, `.image()`, `.audio()`, `.document()`, `.video()`, `.for()`, `.forOpenAI()`, `.forAnthropic()`, `.forGemini()`, `.toJSON()` methods. | Status: not_done
- [ ] **Define ConversationBuilder interface** -- Builder interface with `.system()`, `.user()`, `.assistant()`, `.for()`, `.forOpenAI()`, `.forAnthropic()`, `.forGemini()`, `.toJSON()` methods. | Status: not_done
- [ ] **Define ImageOptions interface** -- `{ mimeType?: string; detail?: 'low' | 'high' | 'auto'; filename?: string }`. | Status: not_done
- [ ] **Define AudioOptions interface** -- `{ mimeType?: string; format?: 'wav' | 'mp3' | 'ogg' | 'flac' | 'webm' }`. | Status: not_done
- [ ] **Define DocumentOptions interface** -- `{ mimeType?: string; filename?: string }`. | Status: not_done
- [ ] **Define VideoOptions interface** -- `{ mimeType?: string }`. | Status: not_done
- [ ] **Define OpenAIRenderOptions interface** -- `{ detail?: 'low' | 'high' | 'auto'; compactText?: boolean; systemRole?: 'system' | 'developer' }`. | Status: not_done
- [ ] **Define ConvertOptions interface** -- `{ unsupportedBehavior?: 'error' | 'skip' | 'placeholder' }`. | Status: not_done
- [ ] **Define OpenAIMessage interface** -- `{ role: 'user' | 'assistant' | 'system' | 'developer'; content: string | Array<Record<string, unknown>> }`. | Status: not_done
- [ ] **Define AnthropicMessage interface** -- `{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }`. | Status: not_done
- [ ] **Define GeminiContent interface** -- `{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }`. | Status: not_done
- [ ] **Define RenderedMessage union type** -- `type RenderedMessage = OpenAIMessage | AnthropicMessage | GeminiContent`. | Status: not_done
- [ ] **Define OpenAIRenderedConversation interface** -- `{ messages: OpenAIMessage[] }`. | Status: not_done
- [ ] **Define AnthropicRenderedConversation interface** -- `{ system?: string; messages: AnthropicMessage[] }`. | Status: not_done
- [ ] **Define GeminiRenderedConversation interface** -- `{ systemInstruction?: { parts: Array<{ text: string }> }; contents: GeminiContent[] }`. | Status: not_done
- [ ] **Define RenderedConversation union type** -- Union of all three rendered conversation types. | Status: not_done
- [ ] **Define RenderWarning interface** -- `{ type: 'unsupported_content' | 'mime_type_inferred' | 'format_inferred'; message: string; partIndex?: number }`. | Status: not_done
- [ ] **Define ConversationInput types** -- `OpenAIConversationInput`, `AnthropicConversationInput`, `GeminiConversationInput`, and their union `ConversationInput` for the `convertConversation` function. | Status: not_done

### 1.3 Error Classes (`src/errors.ts`)

- [ ] **Implement UnsupportedContentError** -- Custom error class with `contentType` and `provider` fields. Thrown when a content type is not supported by the target provider and `unsupportedBehavior` is `'error'`. | Status: not_done
- [ ] **Implement MimeTypeDetectionError** -- Custom error class with `source` field. Thrown when MIME type cannot be auto-detected and is not explicitly provided. | Status: not_done
- [ ] **Implement FileReadError** -- Custom error class with `filePath` field. Thrown when `fs.readFileSync` fails (e.g., `ENOENT`). | Status: not_done
- [ ] **Implement InvalidProviderError** -- Custom error class with `provider` field. Thrown when provider string is not one of `'openai'`, `'anthropic'`, `'gemini'`. | Status: not_done
- [ ] **Implement ConversionError** -- Custom error class with `fromProvider`, `toProvider`, and `detail` fields. Thrown when input message structure does not match expected provider format during conversion. | Status: not_done

### 1.4 Source Detection (`src/detect.ts`)

- [ ] **Implement URL detection** -- Detect strings starting with `http://` or `https://` as URL source type. | Status: not_done
- [ ] **Implement data URL detection** -- Detect strings starting with `data:` as data URL source type. Parse the prefix to extract MIME type. | Status: not_done
- [ ] **Implement raw base64 detection** -- Detect strings containing only base64-valid characters with length > 260 as raw base64 source type. | Status: not_done
- [ ] **Implement file path detection** -- All other strings (not URL, not data URL, not raw base64) are treated as file paths. | Status: not_done
- [ ] **Implement MIME type detection from magic bytes** -- Read first 8 bytes of a Buffer to identify format: JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), GIF (`47 49 46 38`), WebP (`52 49 46 46...57 45 42 50`), BMP (`42 4D`), WAV (`52 49 46 46...57 41 56 45`), PDF (`25 50 44 46`). | Status: not_done
- [ ] **Implement MIME type detection from file extension** -- Map `.jpg`/`.jpeg` to `image/jpeg`, `.png` to `image/png`, `.gif` to `image/gif`, `.webp` to `image/webp`, `.bmp` to `image/bmp`, `.svg` to `image/svg+xml`, `.mp3` to `audio/mpeg`, `.wav` to `audio/wav`, `.ogg` to `audio/ogg`, `.flac` to `audio/flac`, `.webm` to `audio/webm` or `video/webm`, `.pdf` to `application/pdf`, `.mp4` to `video/mp4`, `.mov` to `video/quicktime`, `.avi` to `video/x-msvideo`, `.mkv` to `video/x-matroska`. | Status: not_done
- [ ] **Implement MIME type detection from data URL prefix** -- Parse `data:{mimeType};base64,` to extract MIME type string. Handle optional charset parameter (`data:image/jpeg;charset=utf-8;base64,...`). | Status: not_done
- [ ] **Implement audio format derivation from MIME type** -- Map `audio/wav` to `'wav'`, `audio/mpeg` to `'mp3'`, `audio/mp3` to `'mp3'`, `audio/ogg` to `'ogg'`, `audio/flac` to `'flac'`, `audio/webm` to `'webm'`. | Status: not_done
- [ ] **Throw MimeTypeDetectionError when detection fails** -- If no strategy succeeds and no explicit MIME type is provided, throw `MimeTypeDetectionError`. | Status: not_done

### 1.5 Encoding Utilities (`src/encode.ts`)

- [ ] **Implement Buffer to base64 encoding** -- Convert `Buffer` or `Uint8Array` to base64 string using `Buffer.from(data).toString('base64')`. | Status: not_done
- [ ] **Implement data URL construction** -- Build `data:{mimeType};base64,{data}` string from MIME type and raw base64 data. | Status: not_done
- [ ] **Implement data URL parsing** -- Extract MIME type and raw base64 payload from a data URL string. Strip the `data:...;base64,` prefix. | Status: not_done
- [ ] **Implement file reading** -- Read a file path using `fs.readFileSync(path)`, return the Buffer. Wrap `ENOENT` and other filesystem errors in `FileReadError`. | Status: not_done
- [ ] **Implement data URL prefix stripping** -- When a base64 string has a `data:` prefix, strip it and return the raw base64 payload. Used when rendering for providers that expect raw base64 (Anthropic, Gemini). | Status: not_done

### 1.6 Message Builder (`src/builder.ts`)

- [ ] **Implement MessageBuilder class constructor** -- Accept optional `role` parameter, default to `'user'`. Initialize internal `parts: ContentPart[]` array. | Status: not_done
- [ ] **Implement `.text(content)` method** -- Add a `TextPart` to the internal parts array. Return `this` for chaining. | Status: not_done
- [ ] **Implement `.image(source, options?)` method** -- Detect source type (Buffer, data URL, URL, raw base64, file path). For Buffer: base64-encode and auto-detect MIME type from magic bytes. For data URL: parse MIME type and extract base64 payload. For URL: store as URL reference with `sourceType: 'url'`. For file path: read file, base64-encode, detect MIME type. For raw base64: store as-is, require or detect MIME type. Store `detail` and `filename` from options. Return `this` for chaining. | Status: not_done
- [ ] **Implement `.audio(source, options?)` method** -- Similar to `.image()` but creates `AudioPart`. Derive `format` from MIME type if not explicitly provided (e.g., `audio/wav` -> `'wav'`, `audio/mpeg` -> `'mp3'`). Return `this` for chaining. | Status: not_done
- [ ] **Implement `.document(source, options?)` method** -- Similar to `.image()` but creates `DocumentPart`. Support URL sources for document references. Infer `filename` from file path if available. Return `this` for chaining. | Status: not_done
- [ ] **Implement `.video(source, options?)` method** -- Similar to `.image()` but creates `VideoPart`. Support URL and file URI (`gs://...`) sources. Return `this` for chaining. | Status: not_done
- [ ] **Implement `.toJSON()` method** -- Return `{ role, parts }` as a plain JSON-serializable `InternalMessage` object. | Status: not_done
- [ ] **Implement `.for(provider)` method** -- Dispatch to the correct renderer based on provider string. Validate the provider and throw `InvalidProviderError` for unknown providers. | Status: not_done
- [ ] **Implement `.forOpenAI(options?)` method** -- Delegate to the OpenAI renderer with optional `OpenAIRenderOptions`. | Status: not_done
- [ ] **Implement `.forAnthropic()` method** -- Delegate to the Anthropic renderer. | Status: not_done
- [ ] **Implement `.forGemini()` method** -- Delegate to the Gemini renderer. | Status: not_done
- [ ] **Ensure method chaining preserves part order** -- Content parts must be rendered in the order they were added via `.text()`, `.image()`, etc. | Status: not_done
- [ ] **Implement builder reuse** -- The same builder instance must be callable with `.forOpenAI()`, `.forAnthropic()`, and `.forGemini()` to produce different provider formats from the same content. | Status: not_done

### 1.7 OpenAI Renderer (`src/renderers/openai.ts`)

- [ ] **Render TextPart** -- Convert to `{ type: "text", text }`. | Status: not_done
- [ ] **Render ImagePart (base64)** -- Convert to `{ type: "image_url", image_url: { url: "data:{mimeType};base64,{data}", detail } }`. Construct data URL from raw base64 and MIME type. Use `detail` from part or default from options. | Status: not_done
- [ ] **Render ImagePart (URL)** -- Convert to `{ type: "image_url", image_url: { url, detail } }`. Pass URL through directly. | Status: not_done
- [ ] **Render AudioPart** -- Convert to `{ type: "input_audio", input_audio: { data, format } }`. Use the `format` field from the internal part. | Status: not_done
- [ ] **Render DocumentPart (base64)** -- Convert to `{ type: "file", file: { filename, file_data: "data:{mimeType};base64,{data}" } }`. Construct data URL for `file_data`. Use filename from part or generate a default. | Status: not_done
- [ ] **Handle DocumentPart (URL) as unsupported** -- OpenAI does not support URL-referenced documents. Apply `unsupportedBehavior` logic. | Status: not_done
- [ ] **Handle VideoPart as unsupported** -- OpenAI does not support video content. Apply `unsupportedBehavior` logic. | Status: not_done
- [ ] **Implement compactText option** -- When `compactText: true` and the message contains only a single text part, render `content` as a plain string instead of an array. | Status: not_done
- [ ] **Implement systemRole option** -- Use configured `systemRole` (`'system'` or `'developer'`) for system messages. Default to `'system'`. | Status: not_done
- [ ] **Wrap rendered parts in OpenAI message envelope** -- `{ role, content: [...parts] }`. | Status: not_done

### 1.8 Anthropic Renderer (`src/renderers/anthropic.ts`)

- [ ] **Render TextPart** -- Convert to `{ type: "text", text }`. | Status: not_done
- [ ] **Render ImagePart (base64)** -- Convert to `{ type: "image", source: { type: "base64", media_type: mimeType, data } }`. Use raw base64 (no data URL prefix). | Status: not_done
- [ ] **Render ImagePart (URL)** -- Convert to `{ type: "image", source: { type: "url", url } }`. | Status: not_done
- [ ] **Handle AudioPart as unsupported** -- Anthropic does not support native audio content. Apply `unsupportedBehavior` logic (error/skip/placeholder). | Status: not_done
- [ ] **Render DocumentPart (base64)** -- Convert to `{ type: "document", source: { type: "base64", media_type: mimeType, data } }`. | Status: not_done
- [ ] **Render DocumentPart (URL)** -- Convert to `{ type: "document", source: { type: "url", url } }`. | Status: not_done
- [ ] **Handle VideoPart as unsupported** -- Anthropic does not support video content. Apply `unsupportedBehavior` logic. | Status: not_done
- [ ] **Throw error for system role messages** -- When rendering a single message with `role: 'system'`, throw an error (system messages must be handled at the conversation level). | Status: not_done
- [ ] **Wrap rendered parts in Anthropic message envelope** -- `{ role, content: [...parts] }`. | Status: not_done

### 1.9 Gemini Renderer (`src/renderers/gemini.ts`)

- [ ] **Render TextPart** -- Convert to `{ text }` (no `type` discriminator). | Status: not_done
- [ ] **Render ImagePart (base64)** -- Convert to `{ inlineData: { mimeType, data } }`. Use raw base64. | Status: not_done
- [ ] **Render ImagePart (URL)** -- Convert to `{ fileData: { mimeType, fileUri: url } }`. | Status: not_done
- [ ] **Render AudioPart** -- Convert to `{ inlineData: { mimeType, data } }`. Same format as images. | Status: not_done
- [ ] **Render DocumentPart (base64)** -- Convert to `{ inlineData: { mimeType, data } }`. | Status: not_done
- [ ] **Render DocumentPart (URL)** -- Convert to `{ fileData: { mimeType, fileUri: url } }`. | Status: not_done
- [ ] **Render VideoPart (URL)** -- Convert to `{ fileData: { mimeType, fileUri: url } }`. | Status: not_done
- [ ] **Render VideoPart (base64)** -- Convert to `{ inlineData: { mimeType, data } }`. | Status: not_done
- [ ] **Map role `'assistant'` to `'model'`** -- Gemini uses `'model'` instead of `'assistant'`. | Status: not_done
- [ ] **Throw error for system role messages** -- When rendering a single message with `role: 'system'`, throw an error. | Status: not_done
- [ ] **Wrap rendered parts in Gemini content envelope** -- `{ role, parts: [...parts] }` (using `parts` not `content`). | Status: not_done

### 1.10 Renderer Registry (`src/renderers/index.ts`)

- [ ] **Implement renderer dispatch** -- Map provider string to the correct renderer function. Export a `render(internalMessage, provider, options?)` function that dispatches to the OpenAI, Anthropic, or Gemini renderer. | Status: not_done

### 1.11 Unsupported Content Behavior

- [ ] **Implement `'error'` behavior** -- Throw `UnsupportedContentError` with content type and provider info. This is the default. | Status: not_done
- [ ] **Implement `'skip'` behavior** -- Silently omit the unsupported content part. Include a `RenderWarning` in the warnings array (if warnings are tracked on the result). | Status: not_done
- [ ] **Implement `'placeholder'` behavior** -- Replace the unsupported part with `{ type: "text", text: "[Unsupported: {type} content is not supported by {provider}]" }`. | Status: not_done

### 1.12 Phase 1 Unit Tests

- [ ] **Write detect.ts tests (`src/__tests__/detect.test.ts`)** -- Test URL detection, data URL detection, raw base64 detection, file path detection. Test MIME type detection from magic bytes for JPEG, PNG, GIF, WebP, BMP, WAV, PDF. Test MIME type detection from file extensions. Test data URL prefix parsing including with charset parameter. Test audio format derivation from MIME types. Test `MimeTypeDetectionError` thrown when detection fails. | Status: not_done
- [ ] **Write encode.ts tests (`src/__tests__/encode.test.ts`)** -- Test Buffer to base64 encoding. Test data URL construction. Test data URL parsing and prefix stripping. Test file reading success and `FileReadError` on missing file. | Status: not_done
- [ ] **Write builder.test.ts (`src/__tests__/builder.test.ts`)** -- Test `msg()` creates builder with default role `'user'`. Test `msg('assistant')` creates builder with role `'assistant'`. Test `.text()` adds text part. Test multiple `.text()` calls add multiple parts. Test `.image()` with Buffer. Test `.image()` with data URL (parses MIME, strips prefix). Test `.image()` with HTTPS URL (stores as URL reference). Test `.image()` with file path (reads file, base64-encodes). Test `.image()` with raw base64. Test `.audio()` with correct format derivation. Test `.document()` adds document part. Test `.video()` adds video part. Test `.toJSON()` returns internal representation. Test method chaining preserves order. Test builder reuse (call `.forOpenAI()` and `.forAnthropic()` on the same builder). | Status: not_done
- [ ] **Write OpenAI renderer tests (`src/__tests__/renderers/openai.test.ts`)** -- Test text-only message renders as `{ role, content: [{ type: "text", text }] }`. Test text-only with `compactText: true` renders as `{ role, content: "text" }`. Test image (base64) renders with data URL prefix in `image_url.url`. Test image (URL) renders with URL directly. Test image `detail` mode is included. Test audio renders as `{ type: "input_audio", input_audio: { data, format } }`. Test document renders as `{ type: "file", file: { filename, file_data } }` with data URL. Test unsupported content type (video) triggers configured behavior (error, skip, placeholder). Test system message renders with configured `systemRole`. | Status: not_done
- [ ] **Write Anthropic renderer tests (`src/__tests__/renderers/anthropic.test.ts`)** -- Test text-only message renders correctly. Test image (base64) renders with raw base64 in `source.data` and `source.type: "base64"`. Test image (URL) renders with `source.type: "url"`. Test document renders as `{ type: "document", source: { ... } }`. Test audio throws `UnsupportedContentError` by default. Test audio skipped silently with `unsupportedBehavior: 'skip'`. Test system role message throws error. | Status: not_done
- [ ] **Write Gemini renderer tests (`src/__tests__/renderers/gemini.test.ts`)** -- Test text renders as `{ text }` without type discriminator. Test image (base64) renders as `{ inlineData: { mimeType, data } }`. Test image (URL) renders as `{ fileData: { mimeType, fileUri } }`. Test audio renders as `{ inlineData: { mimeType, data } }`. Test video (URL) renders as `{ fileData: { mimeType, fileUri } }`. Test video (base64) renders as `{ inlineData: { mimeType, data } }`. Test document (base64 and URL) renders correctly. Test role `'assistant'` mapped to `'model'`. Test content array uses `parts` not `content`. Test system role message throws error. | Status: not_done

---

## Phase 2: Conversation Builder (v0.2.0)

### 2.1 Conversation Builder (`src/conversation-builder.ts`)

- [ ] **Implement ConversationBuilder class constructor** -- Initialize internal state: `system?: string`, `messages: InternalMessage[]`. | Status: not_done
- [ ] **Implement `.system(content)` method** -- Set the system message string. Multiple calls replace the previous system message. Return `this` for chaining. | Status: not_done
- [ ] **Implement `.user(content)` method with string** -- When `content` is a string, create a simple text-only user message (`{ role: 'user', parts: [{ type: 'text', text: content }] }`) and append to messages. Return `this`. | Status: not_done
- [ ] **Implement `.user(content)` method with callback** -- When `content` is a function, create a new `MessageBuilder` with role `'user'`, pass it to the callback, extract the internal message, and append to messages. Return `this`. | Status: not_done
- [ ] **Implement `.assistant(content)` method with string** -- Same as `.user()` but with role `'assistant'`. | Status: not_done
- [ ] **Implement `.assistant(content)` method with callback** -- Same as `.user()` callback variant but with role `'assistant'`. | Status: not_done
- [ ] **Implement `.toJSON()` method** -- Return `{ system, messages }` as a plain JSON-serializable `InternalConversation` object. | Status: not_done
- [ ] **Implement `.for(provider)` method** -- Dispatch to the correct conversation renderer based on provider string. | Status: not_done
- [ ] **Implement `.forOpenAI(options?)` method** -- Render all messages for OpenAI. Insert system message as first message in the array with `role: 'system'` (or `'developer'` per `systemRole` option). Return `OpenAIRenderedConversation`. | Status: not_done
- [ ] **Implement `.forAnthropic()` method** -- Render all non-system messages for Anthropic. Extract system message to separate `system` field. Return `AnthropicRenderedConversation`. | Status: not_done
- [ ] **Implement `.forGemini()` method** -- Render all non-system messages for Gemini. Extract system message to `systemInstruction: { parts: [{ text }] }`. Return `GeminiRenderedConversation`. | Status: not_done
- [ ] **Handle no system message** -- When no `.system()` is called, omit the system-related field from the rendered output (`system: undefined` for Anthropic, no `systemInstruction` for Gemini, no system message in OpenAI messages array). | Status: not_done

### 2.2 Phase 2 Unit Tests

- [ ] **Write conversation builder tests (`src/__tests__/conversation.test.ts`)** -- Test `.system()` sets system message. Test multiple `.system()` calls replace previous. Test `.user()` with string adds text-only user message. Test `.user()` with callback adds multimodal user message. Test `.assistant()` with string adds assistant message. Test `.assistant()` with callback. Test message order is preserved. Test `.toJSON()` returns internal representation. | Status: not_done
- [ ] **Write OpenAI conversation rendering tests** -- Test system message is included as first message with `role: 'system'`. Test `systemRole: 'developer'` option. Test multimodal messages in conversation render correctly. Test no system message produces no system message in array. | Status: not_done
- [ ] **Write Anthropic conversation rendering tests** -- Test system message extracted to separate `system` field. Test messages array contains only user/assistant messages. Test multimodal messages render correctly. Test no system message results in `system: undefined`. | Status: not_done
- [ ] **Write Gemini conversation rendering tests** -- Test system message extracted to `systemInstruction: { parts: [{ text }] }`. Test contents array uses `parts` and `role: 'model'` for assistant. Test multimodal messages render correctly. Test no system message results in no `systemInstruction` field. | Status: not_done
- [ ] **Test edge case: system-only conversation** -- Conversation with `.system()` but no `.user()` or `.assistant()` messages. Verify correct behavior for each provider. | Status: not_done

---

## Phase 3: Format Conversion (v0.3.0)

### 3.1 OpenAI Parser (`src/parsers/openai.ts`)

- [ ] **Parse OpenAI text content** -- Convert `{ type: "text", text }` to `TextPart`. | Status: not_done
- [ ] **Parse OpenAI image content (data URL)** -- Convert `{ type: "image_url", image_url: { url: "data:..." } }` to `ImagePart`. Extract MIME type and raw base64 from the data URL. Set `sourceType: 'base64'`. | Status: not_done
- [ ] **Parse OpenAI image content (URL)** -- Convert `{ type: "image_url", image_url: { url: "https://..." } }` to `ImagePart`. Set `sourceType: 'url'`. | Status: not_done
- [ ] **Parse OpenAI audio content** -- Convert `{ type: "input_audio", input_audio: { data, format } }` to `AudioPart`. Derive `mimeType` from `format`. | Status: not_done
- [ ] **Parse OpenAI document/file content** -- Convert `{ type: "file", file: { filename, file_data } }` to `DocumentPart`. Extract base64 and MIME type from `file_data` data URL. | Status: not_done
- [ ] **Parse OpenAI string content** -- When `content` is a plain string (not an array), convert to a single `TextPart`. | Status: not_done
- [ ] **Handle OpenAI system/developer role** -- Map both `'system'` and `'developer'` roles to internal `'system'` role. | Status: not_done

### 3.2 Anthropic Parser (`src/parsers/anthropic.ts`)

- [ ] **Parse Anthropic text content** -- Convert `{ type: "text", text }` to `TextPart`. | Status: not_done
- [ ] **Parse Anthropic image content (base64)** -- Convert `{ type: "image", source: { type: "base64", media_type, data } }` to `ImagePart`. Set `sourceType: 'base64'`. | Status: not_done
- [ ] **Parse Anthropic image content (URL)** -- Convert `{ type: "image", source: { type: "url", url } }` to `ImagePart`. Set `sourceType: 'url'`. | Status: not_done
- [ ] **Parse Anthropic document content (base64)** -- Convert `{ type: "document", source: { type: "base64", media_type, data } }` to `DocumentPart`. | Status: not_done
- [ ] **Parse Anthropic document content (URL)** -- Convert `{ type: "document", source: { type: "url", url } }` to `DocumentPart`. Set `sourceType: 'url'`. | Status: not_done
- [ ] **Parse Anthropic string content** -- When `content` is a plain string, convert to a single `TextPart`. | Status: not_done

### 3.3 Gemini Parser (`src/parsers/gemini.ts`)

- [ ] **Parse Gemini text content** -- Convert `{ text }` to `TextPart`. Identify by presence of `text` key. | Status: not_done
- [ ] **Parse Gemini inlineData content** -- Convert `{ inlineData: { mimeType, data } }` to the appropriate part type (`ImagePart`, `AudioPart`, `DocumentPart`, or `VideoPart`) based on the `mimeType` prefix (`image/`, `audio/`, `application/`, `video/`). | Status: not_done
- [ ] **Parse Gemini fileData content** -- Convert `{ fileData: { mimeType, fileUri } }` to the appropriate part type with `sourceType: 'url'`, storing `fileUri` as the URL. | Status: not_done
- [ ] **Map Gemini role `'model'` to internal `'assistant'`** -- Handle Gemini's role naming convention. | Status: not_done

### 3.4 Parser Registry (`src/parsers/index.ts`)

- [ ] **Implement parser dispatch** -- Map provider string to the correct parser function. Export a `parse(providerMessage, provider)` function that dispatches to the OpenAI, Anthropic, or Gemini parser and returns an `InternalMessage`. | Status: not_done

### 3.5 Message Conversion (`src/convert.ts`)

- [ ] **Implement `convertMessage()` function** -- Parse the source message using the `fromProvider` parser to get an `InternalMessage`, then render it using the `toProvider` renderer. Accept `ConvertOptions` for unsupported content behavior. | Status: not_done
- [ ] **Implement `convertConversation()` function** -- Parse the source conversation (extract system message per source provider's format), convert each message, and render the conversation in the target provider's format (with system message placement per target provider). | Status: not_done
- [ ] **Handle system message extraction during conversation conversion** -- For OpenAI input: find and extract `role: 'system'`/`'developer'` messages from the array. For Anthropic input: read the `system` field. For Gemini input: read the `systemInstruction` field. | Status: not_done
- [ ] **Handle system message injection during conversation conversion** -- For OpenAI output: insert as first message with `role: 'system'`. For Anthropic output: set `system` field. For Gemini output: set `systemInstruction` field. | Status: not_done
- [ ] **Handle role mapping during conversion** -- `'assistant'` to `'model'` when converting to Gemini. `'model'` to `'assistant'` when converting from Gemini. | Status: not_done

### 3.6 Phase 3 Unit Tests

- [ ] **Write OpenAI parser tests (`src/__tests__/parsers/openai.test.ts`)** -- Test parsing text content. Test parsing image with data URL. Test parsing image with HTTPS URL. Test parsing audio. Test parsing document/file. Test parsing string content. Test system/developer role mapping. | Status: not_done
- [ ] **Write Anthropic parser tests (`src/__tests__/parsers/anthropic.test.ts`)** -- Test parsing text. Test parsing image (base64). Test parsing image (URL). Test parsing document (base64). Test parsing document (URL). Test parsing string content. | Status: not_done
- [ ] **Write Gemini parser tests (`src/__tests__/parsers/gemini.test.ts`)** -- Test parsing text. Test parsing inlineData (image, audio, document, video). Test parsing fileData. Test role `'model'` to `'assistant'` mapping. | Status: not_done
- [ ] **Write conversion tests (`src/__tests__/convert.test.ts`)** -- Test OpenAI image (data URL) to Anthropic (raw base64 + `media_type`). Test OpenAI image (URL) to Anthropic (`source.type: "url"`). Test Anthropic image (base64) to OpenAI (data URL). Test Anthropic image (URL) to OpenAI (`image_url.url`). Test OpenAI to Gemini (`inlineData`/`fileData`). Test Gemini to OpenAI. Test Anthropic to Gemini. Test Gemini to Anthropic. Test role mapping `assistant` <-> `model`. Test system message extraction during conversation conversion (all 6 provider pairs). Test system message injection during conversation conversion. Test text-only messages convert correctly. Test multi-part messages convert correctly. Test unsupported content types handled per configuration. | Status: not_done

---

## Phase 4: CLI and Configuration (v0.4.0)

### 4.1 Global Configuration (`src/configure.ts`)

- [ ] **Implement `configure()` function** -- Accept configuration object with `defaultProvider`, `unsupportedBehavior`, and `openai`-specific options (`detail`, `compactText`, `systemRole`). Store in a module-level config object. | Status: not_done
- [ ] **Implement config getter** -- Export a function to retrieve current configuration. Used by builders and renderers to read global defaults. | Status: not_done
- [ ] **Merge per-call options with global config** -- Options passed to `.forOpenAI()`, `.for()`, etc. should override global config. Global config provides defaults. | Status: not_done
- [ ] **Implement sensible defaults** -- `unsupportedBehavior: 'error'`, `openai.detail: 'auto'`, `openai.compactText: false`, `openai.systemRole: 'system'`, `defaultProvider: undefined`. | Status: not_done

### 4.2 CLI Implementation (`src/cli.ts`)

- [ ] **Implement CLI entry point** -- Parse command-line arguments. Support `convert <from> <to> [input]` command. | Status: not_done
- [ ] **Implement `--conversation` flag** -- When present, treat input as a full conversation and use `convertConversation()`. When absent, treat input as a single message and use `convertMessage()`. | Status: not_done
- [ ] **Implement `--unsupported <behavior>` flag** -- Accept `error`, `skip`, or `placeholder`. Pass to conversion options. Default: `error`. | Status: not_done
- [ ] **Implement `--pretty` flag** -- When present, pretty-print JSON output with 2-space indentation. Default: compact JSON. | Status: not_done
- [ ] **Implement `--output <path>` flag** -- When present, write output to the specified file path instead of stdout. | Status: not_done
- [ ] **Implement `--version` flag** -- Print package version from `package.json` and exit. | Status: not_done
- [ ] **Implement `--help` flag** -- Print usage information and exit. | Status: not_done
- [ ] **Implement stdin input** -- Read JSON from stdin when no `[input]` argument is provided or when `[input]` is `'-'`. | Status: not_done
- [ ] **Implement file input** -- Read JSON from the specified file path when `[input]` is provided. | Status: not_done
- [ ] **Implement exit codes** -- Exit `0` on success, `1` on conversion error, `2` on configuration error (invalid flags, missing arguments, unsupported provider). | Status: not_done
- [ ] **Validate provider arguments** -- Ensure `<from>` and `<to>` are valid provider strings (`openai`, `anthropic`, `gemini`). Exit with code `2` on invalid provider. | Status: not_done
- [ ] **Add shebang line** -- Add `#!/usr/bin/env node` to the top of `cli.ts` for direct execution. | Status: not_done

### 4.3 Phase 4 Unit Tests

- [ ] **Write CLI integration tests (`src/__tests__/cli.test.ts`)** -- Test `convert openai anthropic` with stdin input. Test `convert openai gemini` with file input. Test `--conversation` flag with full conversation input. Test `--unsupported skip` flag. Test `--pretty` flag produces indented JSON. Test `--output` flag writes to file. Test `--version` prints version. Test `--help` prints usage. Test exit code `0` on success. Test exit code `1` on conversion error. Test exit code `2` on invalid provider. Test exit code `2` on missing arguments. | Status: not_done
- [ ] **Write configuration tests** -- Test `configure()` sets global defaults. Test per-call options override global config. Test default config values. Test that configuration affects rendering (e.g., `unsupportedBehavior: 'skip'` causes silent omission). | Status: not_done

---

## Phase 5: Polish (v0.5.0)

### 5.1 Public API Exports (`src/index.ts`)

- [ ] **Export primary functions** -- Export `msg`, `conversation`, `convertMessage`, `convertConversation`, `configure` from `src/index.ts`. | Status: not_done
- [ ] **Export all type definitions** -- Export all types listed in the spec's "Type Exports" section: `Provider`, `ContentPart`, `TextPart`, `ImagePart`, `AudioPart`, `DocumentPart`, `VideoPart`, `ContentSource`, `InternalMessage`, `InternalConversation`, `MessageBuilder`, `ConversationBuilder`, `ImageOptions`, `AudioOptions`, `DocumentOptions`, `VideoOptions`, `OpenAIRenderOptions`, `ConvertOptions`, `OpenAIMessage`, `AnthropicMessage`, `GeminiContent`, `RenderedMessage`, `RenderedConversation`, `OpenAIRenderedConversation`, `AnthropicRenderedConversation`, `GeminiRenderedConversation`, `RenderWarning`. | Status: not_done
- [ ] **Export error classes** -- Export `UnsupportedContentError`, `MimeTypeDetectionError`, `FileReadError`, `InvalidProviderError`, `ConversionError`. | Status: not_done

### 5.2 Edge Case Handling

- [ ] **Handle empty message (zero content parts)** -- Ensure rendering a message with no `.text()`, `.image()`, etc. calls produces a valid message with an empty content array (or handle gracefully per provider). | Status: not_done
- [ ] **Handle message with only unsupported parts** -- When all content parts are unsupported for the target provider and `unsupportedBehavior` is `'skip'`, ensure the result is a valid (possibly empty) message. | Status: not_done
- [ ] **Handle explicit MIME type overriding magic bytes** -- When `options.mimeType` is provided, use it even if magic bytes suggest a different type. Trust the caller. | Status: not_done
- [ ] **Handle very large base64 strings** -- Ensure no truncation occurs for large base64 data. Verify memory handling. | Status: not_done
- [ ] **Handle mixed content types in one message** -- Test text + image + audio + document in a single message rendered for each provider, with unsupported parts handled appropriately. | Status: not_done
- [ ] **Handle URLs with query parameters and fragments** -- Ensure URLs like `https://example.com/photo.jpg?size=large#section` are passed through correctly without modification. | Status: not_done
- [ ] **Handle file paths with spaces and special characters** -- Ensure file paths like `/path/to/my photo (1).jpg` are read correctly. | Status: not_done
- [ ] **Handle data URL with charset parameter** -- Parse `data:image/jpeg;charset=utf-8;base64,...` correctly, extracting `image/jpeg` as the MIME type. | Status: not_done
- [ ] **Handle `gs://` file URIs for Gemini video** -- Ensure Google Cloud Storage URIs are treated as URL references, not file paths. | Status: not_done

### 5.3 Conversion Roundtrip Tests

- [ ] **Test OpenAI -> Anthropic -> OpenAI roundtrip** -- Convert a multimodal message from OpenAI to Anthropic and back. Verify the result is semantically equivalent to the original (base64 data preserved, MIME types preserved, structure correct). | Status: not_done
- [ ] **Test OpenAI -> Gemini -> OpenAI roundtrip** -- Same as above for OpenAI-Gemini pair. | Status: not_done
- [ ] **Test Anthropic -> Gemini -> Anthropic roundtrip** -- Same for Anthropic-Gemini pair. | Status: not_done
- [ ] **Test conversation roundtrip with system messages** -- Convert a full conversation with system message between all provider pairs and verify system message is preserved. | Status: not_done

### 5.4 Documentation

- [ ] **Write README.md** -- Include package overview, installation instructions, usage examples for `msg()`, `conversation()`, `convertMessage()`, `convertConversation()`, `configure()`, CLI usage, provider comparison table, API reference, and integration examples with `vision-prep`, `audio-chunker`, `schema-bridge`. | Status: not_done

### 5.5 Final Verification

- [ ] **Bump version in package.json** -- Update version to the appropriate release version following semver. | Status: not_done
- [ ] **Run full test suite** -- `npm run test` -- all tests must pass. | Status: not_done
- [ ] **Run linter** -- `npm run lint` -- no lint errors. | Status: not_done
- [ ] **Run build** -- `npm run build` -- TypeScript compilation succeeds with no errors. | Status: not_done
- [ ] **Verify zero runtime dependencies** -- Confirm `package.json` has no `dependencies` field (only `devDependencies`). | Status: not_done
- [ ] **Verify package size** -- Ensure the built `dist/` output is under 15 KB as specified. | Status: not_done
- [ ] **Verify Node.js 18+ compatibility** -- Ensure no APIs are used that require Node.js > 18. | Status: not_done
- [ ] **Verify `dist/` output structure** -- Confirm `dist/index.js`, `dist/index.d.ts`, and all sub-module outputs are generated correctly. | Status: not_done
