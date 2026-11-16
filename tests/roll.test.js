'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pick } = require('../assets/roll.js');

const MYSTERY = 'https://portswigger.net/academy/labs/launchMystery?categoryId=';
const REF = '&referrer=/web-security/mystery-lab-challenge';

const sqli = { id: 1, name: 'SQL injection', kind: 'mystery', levels: [1] };
const xss = { id: 2, name: 'Cross-site scripting', kind: 'mystery', levels: [0, 1, 2] };
const csrf = { id: 3, name: 'CSRF', kind: 'mystery', levels: [0, 1] };
const topics = [sqli, xss, csrf];

test('a mystery topic launches launchMystery with its categoryId and level', () => {
  const r = pick(topics, [2], 0, () => 0);
  assert.equal(r.topic, xss);
  assert.equal(r.lab, null);
  assert.equal(r.url, MYSTERY + '2&level=0' + REF);
});

test('the level filter skips pool topics with no labs at that level', () => {
  // SQLi is Practitioner-only, so at Apprentice only XSS and CSRF can come up.
  const seen = [0, 0.5, 0.99].map((x) => pick(topics, [1, 2, 3], 0, () => x).topic.id);
  assert.deepEqual(seen, [2, 3, 3]);
});

test('"Any" level makes every pool topic eligible and is sent as -1', () => {
  const r = pick(topics, [1], -1, () => 0);
  assert.equal(r.topic, sqli);
  assert.equal(r.url, MYSTERY + '1&level=-1' + REF);
});

test('nothing to roll returns null', () => {
  assert.equal(pick(topics, [], 1, () => 0), null);
  assert.equal(pick(topics, [1], 2, () => 0), null);
});

test('topic choice is uniform across the eligible topics', () => {
  const n = 3;
  const counts = {};
  for (let i = 0; i < n * 100; i++) {
    const id = pick(topics, [1, 2, 3], 1, () => i / (n * 100)).topic.id;
    counts[id] = (counts[id] || 0) + 1;
  }
  assert.deepEqual(counts, { 1: 100, 2: 100, 3: 100 });
});
