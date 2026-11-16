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

const LAUNCH = 'https://portswigger.net/academy/labs/launch/';

const osLabs = [
  { labId: 'aaa', level: 0, title: 'OS command injection, simple case',
    path: '/web-security/os-command-injection/lab-simple' },
  { labId: 'bbb', level: 1, title: 'Blind OS command injection with time delays',
    path: '/web-security/os-command-injection/lab-blind-time-delays' },
  { labId: 'ccc', level: 1, title: 'Blind OS command injection with output redirection',
    path: '/web-security/os-command-injection/lab-blind-output-redirection' }
];
const osci = { id: 10, name: 'OS command injection', kind: 'direct', levels: [0, 1], labs: osLabs };

test('a direct topic launches one of its labs with the lab page as referrer', () => {
  const r = pick([osci], [10], 0, () => 0);
  assert.equal(r.topic, osci);
  assert.equal(r.lab, osLabs[0]);
  assert.equal(r.url, LAUNCH + 'aaa?referrer=%2Fweb-security%2Fos-command-injection%2Flab-simple');
});

// Feeds pick() one value per call: first the topic draw, then the lab draw.
const seq = (...xs) => () => xs.shift();

test('a direct topic only draws labs at the chosen level', () => {
  const ids = [0, 0.5, 0.99].map((x) => pick([osci], [10], 1, seq(0, x)).lab.labId);
  assert.deepEqual(ids, ['bbb', 'ccc', 'ccc']);
});

test('"Any" on a direct topic draws from all of its labs', () => {
  const ids = [0, 0.4, 0.99].map((x) => pick([osci], [10], -1, seq(0, x)).lab.labId);
  assert.deepEqual(ids, ['aaa', 'bbb', 'ccc']);
});

test('a direct topic with no labs at the level is skipped like a mystery one', () => {
  assert.equal(pick([osci], [10], 2, () => 0), null);
  const r = pick([sqli, osci], [1, 10], 0, () => 0);
  assert.equal(r.topic, osci);
});

test('topic choice is uniform across mystery and direct topics alike', () => {
  const counts = {};
  for (let i = 0; i < 400; i++) {
    const id = pick([...topics, osci], [1, 2, 3, 10], 1, seq(i / 400, 0)).topic.id;
    counts[id] = (counts[id] || 0) + 1;
  }
  assert.deepEqual(counts, { 1: 100, 2: 100, 3: 100, 10: 100 });
});
