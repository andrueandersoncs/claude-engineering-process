const { test } = require('node:test');
const assert = require('node:assert');
const { add, multiply } = require('../../src/index.js');

test('add returns correct sum', () => {
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(-1, 1), 0);
  assert.strictEqual(add(0, 0), 0);
});

test('multiply returns correct product', () => {
  assert.strictEqual(multiply(2, 3), 6);
  assert.strictEqual(multiply(-1, 5), -5);
  assert.strictEqual(multiply(0, 100), 0);
});
