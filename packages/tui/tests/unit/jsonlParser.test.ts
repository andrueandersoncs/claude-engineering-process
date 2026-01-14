/**
 * Unit tests for the JsonlStreamParser service.
 *
 * These tests verify the JSONL parser can parse Claude CLI streaming output
 * into structured JsonlMessage objects.
 *
 * Following TDD principles, these tests are written BEFORE the implementation exists,
 * so they will FAIL initially.
 *
 * Test criteria from Task 1.1:
 * - Test parsing text_delta events
 * - Test parsing tool_use events
 * - Test partial line buffering across chunks
 * - Test malformed JSON handling (skip, don't throw)
 * - Test flush() for remaining buffer
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import the module under test - this will fail until implementation exists
import { JsonlStreamParser, type JsonlMessage } from '../../src/services/jsonlParser';

describe('JsonlStreamParser', () => {
  let parser: JsonlStreamParser;

  beforeEach(() => {
    parser = new JsonlStreamParser();
  });

  describe('text_delta event parsing', () => {
    it('parses content_block_delta with text_delta type', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'text',
        content: 'Hello',
      });
    });

    it('parses multiple text_delta events in sequence', () => {
      const input =
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}\n';

      const messages = parser.parse(input);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe(' world');
      expect(messages[2].content).toBe('!');
    });

    it('handles text with special characters', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello\\n\\tWorld \\"quoted\\""}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello\n\tWorld "quoted"');
    });

    it('handles empty text content', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":""}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('');
    });

    it('handles unicode characters in text', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello 👋 世界"}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello 👋 世界');
    });
  });

  describe('tool_use event parsing', () => {
    it('parses content_block_start with tool_use type', () => {
      const input = '{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01","name":"Read","input":{}}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'tool_use',
        content: 'Using tool: Read',
        toolName: 'Read',
        toolInput: {},
      });
    });

    it('parses tool_use with complex input', () => {
      const input = '{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_02","name":"Write","input":{"file_path":"/tmp/test.txt","content":"test"}}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('tool_use');
      expect(messages[0].toolName).toBe('Write');
      expect(messages[0].toolInput).toEqual({
        file_path: '/tmp/test.txt',
        content: 'test',
      });
    });

    it('parses multiple different tool_use events', () => {
      const input =
        '{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01","name":"Read","input":{"path":"file.ts"}}}\n' +
        '{"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_02","name":"Edit","input":{"file":"file.ts"}}}\n';

      const messages = parser.parse(input);

      expect(messages).toHaveLength(2);
      expect(messages[0].toolName).toBe('Read');
      expect(messages[1].toolName).toBe('Edit');
    });
  });

  describe('result event parsing', () => {
    it('parses result event', () => {
      const input = '{"type":"result","result":"Task completed successfully"}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'result',
        content: 'Task completed successfully',
      });
    });

    it('handles result event with empty result', () => {
      const input = '{"type":"result","result":""}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('result');
      expect(messages[0].content).toBe('');
    });

    it('handles result event with null result', () => {
      const input = '{"type":"result","result":null}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('result');
      expect(messages[0].content).toBe('');
    });
  });

  describe('message content parsing', () => {
    it('parses assistant message with text content', () => {
      const input = '{"message":{"content":[{"type":"text","text":"Hello from assistant"}]}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'text',
        content: 'Hello from assistant',
      });
    });

    it('extracts first text item from message content array', () => {
      const input = '{"message":{"content":[{"type":"tool_use","id":"t1"},{"type":"text","text":"Response text"}]}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('text');
      expect(messages[0].content).toBe('Response text');
    });
  });

  describe('partial line buffering', () => {
    it('buffers incomplete JSON across chunks', () => {
      // First chunk - incomplete line
      const chunk1 = '{"type":"content_block';
      const messages1 = parser.parse(chunk1);
      expect(messages1).toHaveLength(0);

      // Second chunk - completes the line
      const chunk2 = '_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n';
      const messages2 = parser.parse(chunk2);

      expect(messages2).toHaveLength(1);
      expect(messages2[0].content).toBe('Hi');
    });

    it('handles chunk split in middle of JSON string', () => {
      const chunk1 = '{"type":"content_block_delta","index":0,"delta":{"type":"text_del';
      const messages1 = parser.parse(chunk1);
      expect(messages1).toHaveLength(0);

      const chunk2 = 'ta","text":"Split text"}}\n';
      const messages2 = parser.parse(chunk2);

      expect(messages2).toHaveLength(1);
      expect(messages2[0].content).toBe('Split text');
    });

    it('handles multiple complete lines with trailing incomplete', () => {
      const chunk = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"First"}}\n{"type":"content_block';
      const messages = parser.parse(chunk);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('First');
    });

    it('accumulates buffer across multiple incomplete chunks', () => {
      const chunk1 = '{"type":';
      const chunk2 = '"content_block_delta"';
      const chunk3 = ',"index":0,"delta":';
      const chunk4 = '{"type":"text_delta","text":"Assembled"}}\n';

      expect(parser.parse(chunk1)).toHaveLength(0);
      expect(parser.parse(chunk2)).toHaveLength(0);
      expect(parser.parse(chunk3)).toHaveLength(0);

      const messages = parser.parse(chunk4);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Assembled');
    });

    it('handles newline-only chunks correctly', () => {
      parser.parse('{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Test"}}');
      const messages = parser.parse('\n');

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Test');
    });
  });

  describe('flush() method', () => {
    it('returns empty array when buffer is empty', () => {
      const messages = parser.flush();
      expect(messages).toEqual([]);
    });

    it('returns empty array after complete lines parsed', () => {
      parser.parse('{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Done"}}\n');
      const messages = parser.flush();
      expect(messages).toEqual([]);
    });

    it('parses and returns buffered incomplete line', () => {
      parser.parse('{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Final"}}');
      const messages = parser.flush();

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Final');
    });

    it('clears buffer after flush', () => {
      parser.parse('{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Data"}}');
      parser.flush();

      // Second flush should return nothing
      const messages = parser.flush();
      expect(messages).toEqual([]);
    });

    it('handles whitespace-only buffer gracefully', () => {
      parser.parse('   \t  ');
      const messages = parser.flush();
      expect(messages).toEqual([]);
    });

    it('handles malformed JSON in buffer gracefully', () => {
      parser.parse('{"type":"incomplete');
      const messages = parser.flush();

      // Should not throw, just return empty
      expect(messages).toEqual([]);
    });
  });

  describe('malformed JSON handling', () => {
    it('skips malformed JSON lines without throwing', () => {
      const input = 'not valid json\n{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n';

      // Should not throw
      let messages: JsonlMessage[] = [];
      expect(() => {
        messages = parser.parse(input);
      }).not.toThrow();

      // Should still parse valid line
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Valid');
    });

    it('skips empty JSON objects', () => {
      const input = '{}\n{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Valid');
    });

    it('skips JSON with unknown event type', () => {
      const input =
        '{"type":"message_start","message":{"id":"msg_01"}}\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n' +
        '{"type":"message_stop"}\n';

      const messages = parser.parse(input);

      // Should only return the text_delta message
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Valid');
    });

    it('handles truncated JSON gracefully', () => {
      const input = '{"type":"content_block_delta","index":0\n';
      const messages = parser.parse(input);

      expect(messages).toEqual([]);
    });

    it('handles JSON array instead of object', () => {
      const input = '[1, 2, 3]\n{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n';

      let messages: JsonlMessage[] = [];
      expect(() => {
        messages = parser.parse(input);
      }).not.toThrow();

      expect(messages).toHaveLength(1);
    });

    it('handles mixed valid and invalid lines', () => {
      const input =
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"First"}}\n' +
        'garbage data here\n' +
        '{"incomplete": true\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Second"}}\n' +
        'more garbage\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Third"}}\n';

      const messages = parser.parse(input);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('skips debug output lines', () => {
      const input =
        '[DEBUG] Starting process...\n' +
        '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n' +
        '[INFO] Process running\n';

      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Valid');
    });
  });

  describe('empty line handling', () => {
    it('ignores empty lines', () => {
      const input = '\n\n{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
    });

    it('ignores whitespace-only lines', () => {
      const input = '   \n\t\t\n{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Valid"}}\n  \n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(1);
    });
  });

  describe('real Claude CLI output format', () => {
    it('parses message_start event (ignores, no content)', () => {
      const input = '{"type":"message_start","message":{"id":"msg_01XFDUDYJgAACzvnptvVoYEL","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":1}}}\n';
      const messages = parser.parse(input);

      // message_start has no displayable content, should be ignored
      expect(messages).toHaveLength(0);
    });

    it('parses content_block_start for text (ignores empty)', () => {
      const input = '{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n';
      const messages = parser.parse(input);

      // Empty text block start, no content to display
      expect(messages).toHaveLength(0);
    });

    it('parses content_block_stop (ignores)', () => {
      const input = '{"type":"content_block_stop","index":0}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(0);
    });

    it('parses message_delta (ignores)', () => {
      const input = '{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":12}}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(0);
    });

    it('parses message_stop (ignores)', () => {
      const input = '{"type":"message_stop"}\n';
      const messages = parser.parse(input);

      expect(messages).toHaveLength(0);
    });

    it('parses complete Claude response stream', () => {
      // Sample from design.md fixtures/sample-jsonl-output.txt
      const input = `{"type":"message_start","message":{"id":"msg_01XFDUDYJgAACzvnptvVoYEL","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":25,"output_tokens":1}}}
{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}
{"type":"content_block_stop","index":0}
{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":12}}
{"type":"message_stop"}
`;

      const messages = parser.parse(input);

      // Should only extract the text_delta content
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ type: 'text', content: 'Hello' });
      expect(messages[1]).toEqual({ type: 'text', content: '!' });
    });
  });

  describe('interface requirements', () => {
    it('returns JsonlMessage with required type field', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Test"}}\n';
      const messages = parser.parse(input);

      expect(messages[0]).toHaveProperty('type');
      expect(['text', 'tool_use', 'system', 'result']).toContain(messages[0].type);
    });

    it('returns JsonlMessage with required content field', () => {
      const input = '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Test"}}\n';
      const messages = parser.parse(input);

      expect(messages[0]).toHaveProperty('content');
      expect(typeof messages[0].content).toBe('string');
    });

    it('returns tool_use message with toolName and toolInput', () => {
      const input = '{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01","name":"Read","input":{"path":"test.ts"}}}\n';
      const messages = parser.parse(input);

      expect(messages[0].toolName).toBe('Read');
      expect(messages[0].toolInput).toEqual({ path: 'test.ts' });
    });
  });
});
