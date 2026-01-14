/**
 * JSONL Stream Parser for Claude CLI Output
 *
 * Parses Claude's streaming JSONL output (--output-format stream-json) and
 * extracts displayable content. Handles partial lines across chunks via buffering.
 *
 * This parser is designed to work with the Claude CLI's JSONL stream format,
 * which emits newline-delimited JSON events for real-time streaming. It filters
 * out metadata events and extracts only the content that should be displayed to users.
 *
 * **Supported event types:**
 * - `content_block_delta` with `text_delta` - Streaming text from Claude's response
 * - `content_block_start` with `tool_use` - Tool invocation events
 * - `result` - Final completion event
 *
 * **Ignored event types:**
 * - `message_start`, `message_stop` - Message lifecycle markers
 * - `content_block_stop` - Content block end markers
 * - `message_delta` - Metadata updates (token counts, etc.)
 *
 * @see {@link https://github.com/anthropics/anthropic-sdk-typescript/issues/771|GitHub Issue #771}
 *      for context on streaming output format and spawn configuration
 */

/**
 * Structured message extracted from Claude's JSONL stream.
 */
export interface JsonlMessage {
  type: 'text' | 'tool_use' | 'system' | 'result';
  content: string;
  toolName?: string;
  toolInput?: unknown;
}

/**
 * Parses Claude CLI streaming JSONL output into structured messages.
 *
 * This parser maintains an internal buffer to handle partial JSON lines that
 * may be split across stream chunks. Call `parse()` for each chunk and `flush()`
 * when the stream ends to process any remaining buffered content.
 *
 * Usage:
 * ```typescript
 * const parser = new JsonlStreamParser();
 *
 * stream.on('data', (chunk) => {
 *   const messages = parser.parse(chunk.toString());
 *   for (const msg of messages) {
 *     if (msg.type === 'text') {
 *       console.log(msg.content);
 *     } else if (msg.type === 'tool_use') {
 *       console.log(`[Tool: ${msg.toolName}]`);
 *     }
 *   }
 * });
 *
 * stream.on('end', () => {
 *   const remaining = parser.flush();
 *   // Handle any remaining buffered content
 * });
 * ```
 *
 * @see {@link https://github.com/anthropics/anthropic-sdk-typescript/issues/771|GitHub Issue #771}
 */
export class JsonlStreamParser {
  private buffer: string = '';

  /**
   * Process incoming chunk, return parsed messages.
   *
   * Handles partial lines by buffering until a newline is encountered. This is
   * critical for JSONL parsing because JSON lines may be split across multiple
   * stream chunks.
   *
   * @param chunk - Raw string chunk from stream
   * @returns Array of parsed messages (may be empty if no complete lines yet)
   */
  parse(chunk: string): JsonlMessage[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

    const messages: JsonlMessage[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = this.parseLine(line);
        if (msg) messages.push(msg);
      } catch {
        // Skip malformed JSON (may be debug output)
      }
    }
    return messages;
  }

  /**
   * Flush any remaining buffered content.
   * Call this when the stream ends to process any incomplete final line.
   *
   * @returns Array of parsed messages from remaining buffer (may be empty)
   */
  flush(): JsonlMessage[] {
    if (!this.buffer.trim()) {
      this.buffer = '';
      return [];
    }
    try {
      const msg = this.parseLine(this.buffer);
      this.buffer = '';
      return msg ? [msg] : [];
    } catch {
      this.buffer = '';
      return [];
    }
  }

  /**
   * Parse a single JSONL line into a message.
   *
   * Extracts displayable content from Claude API event types. Returns null for
   * metadata events that shouldn't be shown to users (message_start, message_stop, etc.).
   *
   * @param line - Single line of JSON
   * @returns Parsed message or null if event type is not displayable
   */
  private parseLine(line: string): JsonlMessage | null {
    const json = JSON.parse(line);

    // Handle content_block_delta events (streaming text)
    if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') {
        return { type: 'text', content: json.delta.text };
      }
    }

    // Handle tool_use events (content_block_start with tool_use type)
    if (json.type === 'content_block_start') {
      if (json.content_block?.type === 'tool_use') {
        return {
          type: 'tool_use',
          content: `Using tool: ${json.content_block.name}`,
          toolName: json.content_block.name,
          toolInput: json.content_block.input,
        };
      }
      // Ignore content_block_start for text type (empty placeholder)
    }

    // Handle assistant messages with content array
    if (json.message?.content) {
      for (const item of json.message.content) {
        if (item.type === 'text') {
          return { type: 'text', content: item.text };
        }
      }
    }

    // Handle result event (final message)
    if (json.type === 'result') {
      return {
        type: 'result',
        content: json.result ?? '',
      };
    }

    // Ignore other event types:
    // - message_start (no displayable content)
    // - content_block_stop (end marker)
    // - message_delta (metadata only)
    // - message_stop (end marker)
    return null;
  }
}
