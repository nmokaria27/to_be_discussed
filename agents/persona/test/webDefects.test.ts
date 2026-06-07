import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detectWebDefects, type WebSnapshot } from '../src/webDefects.ts';

const base: WebSnapshot = {
  url: 'https://example.com/app',
  title: 'My App',
  lang: 'en',
  headings: 2,
  nodes: [{ tag: 'h1', hasText: true }],
  consoleErrors: [],
};

test('flags images missing alt text (accessibility)', () => {
  const hints = detectWebDefects({ ...base, nodes: [{ tag: 'img', alt: null }, { tag: 'img', alt: '' }, { tag: 'h1', hasText: true }] });
  const a = hints.find((h) => h.title.includes('image'));
  assert.ok(a);
  assert.equal(a!.edge_case, 'accessibility');
});

test('flags interactive controls without an accessible name', () => {
  const hints = detectWebDefects({ ...base, nodes: [{ tag: 'button', name: '' }, { tag: 'h1', hasText: true }] });
  assert.ok(hints.some((h) => h.title.includes('accessible name') && h.severity === 'high'));
});

test('flags missing lang attribute', () => {
  const hints = detectWebDefects({ ...base, lang: null });
  assert.ok(hints.some((h) => h.title.includes('lang')));
});

test('flags an empty / blank-render page', () => {
  const hints = detectWebDefects({ ...base, headings: 0, nodes: [{ tag: 'img', alt: 'x' }] });
  assert.ok(hints.some((h) => h.edge_case === 'empty_state'));
});

test('flags network/console errors as slow_network', () => {
  const hints = detectWebDefects({ ...base, consoleErrors: ['Failed to load resource: net::ERR_TIMED_OUT'] });
  assert.ok(hints.some((h) => h.edge_case === 'slow_network'));
});

test('a clean, accessible page yields no defects', () => {
  const hints = detectWebDefects({
    ...base,
    nodes: [{ tag: 'h1', hasText: true }, { tag: 'img', alt: 'logo' }, { tag: 'button', name: 'Save' }],
  });
  assert.equal(hints.length, 0);
});
