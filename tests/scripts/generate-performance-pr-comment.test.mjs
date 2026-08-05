import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPassedTestsSection } from './generate-performance-pr-comment.mjs';

test('buildPassedTestsSection includes collapsed API calls for each passed scenario', () => {
  const md = buildPassedTestsSection([
    {
      testName: 'Cold Start Login',
      platform: 'Android',
      device: 'Google Pixel 8 Pro (v14.0)',
      duration: '12.34s',
      team: 'wallet',
      recordingLink: 'https://example.com/video',
      apiCalls: [
        { method: 'GET', url: 'https://api.example.com/tokens' },
        { method: 'GET', url: 'https://api.example.com/tokens' },
        { method: 'POST', url: 'https://api.example.com/rpc' },
      ],
    },
    {
      testName: 'Perps add funds',
      platform: 'Android',
      device: 'Google Pixel 8 Pro (v14.0)',
      duration: '8.00s',
      team: 'perps',
      recordingLink: null,
      apiCalls: [
        { method: 'GET', url: 'https://api.hyperliquid.xyz/info' },
        { method: 'GET', url: 'https://api.hyperliquid.xyz/info' },
        { method: 'GET', url: 'https://api.hyperliquid.xyz/info' },
        { method: 'GET', url: 'https://api.hyperliquid.xyz/info' },
      ],
    },
  ]);

  assert.match(md, /✅ Passed Tests \(2\)/);
  assert.match(md, /#### Cold Start Login/);
  assert.match(md, /API calls \(3\)/);
  assert.match(md, /https:\/\/api\.example\.com\/tokens -> 2/);
  assert.match(md, /#### Perps add funds/);
  assert.match(md, /API calls \(4\)/);
  assert.match(md, /https:\/\/api\.hyperliquid\.xyz\/info -> 4/);
});

test('buildPassedTestsSection omits API calls details when none were captured', () => {
  const md = buildPassedTestsSection([
    {
      testName: 'No network scenario',
      platform: 'Android',
      device: 'Pixel',
      duration: '1.00s',
      team: 'qa',
      recordingLink: null,
      apiCalls: null,
    },
  ]);

  assert.match(md, /#### No network scenario/);
  assert.equal(md.includes('API calls'), false);
});

test('buildPassedTestsSection returns empty string for no passed tests', () => {
  assert.equal(buildPassedTestsSection([]), '');
});
