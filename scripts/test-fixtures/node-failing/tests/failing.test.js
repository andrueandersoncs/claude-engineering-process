const { test } = require('node:test');
const assert = require('node:assert');

test('this test intentionally fails', () => {
  assert.strictEqual(1, 2, 'Intentional failure for testing');
});
