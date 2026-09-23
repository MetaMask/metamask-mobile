import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isUserId,
  openDirectMessage,
  buildText,
  postSummary,
} from './post-app-profiling-slack.mjs';

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

test('isUserId distinguishes user ids from conversation ids', () => {
  assert.equal(isUserId('UEYQL2PEV'), true);
  assert.equal(isUserId('W012ABCDEF'), true);
  // A personal DM conversation id is not a user id and cannot be opened.
  assert.equal(isUserId('DEZ9UAP8T'), false);
  assert.equal(isUserId('C0BTXK2MAE5'), false);
  assert.equal(isUserId(''), false);
});

test('openDirectMessage resolves the bot DM channel for a user id', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return jsonResponse({ ok: true, channel: { id: 'D123RESOLVED' } });
  };

  const channel = await openDirectMessage('UEYQL2PEV', 'token', { fetchFn });

  assert.equal(channel, 'D123RESOLVED');
  assert.match(calls[0].url, /conversations\.open$/);
  assert.equal(calls[0].body.users, 'UEYQL2PEV');
});

test('buildText appends the run link and truncates long input', () => {
  assert.equal(
    buildText('hello', 'https://example.com/run'),
    'hello\n<https://example.com/run|GitHub run>',
  );
  assert.equal(buildText('hello', ''), 'hello');

  const long = buildText('x'.repeat(50_000), '');
  assert.ok(long.length < 39_000);
  assert.match(long, /Truncated for Slack\./);
});

test('buildText labels the run link so a failure notice names its target', () => {
  assert.equal(
    buildText('hello', 'https://example.com/run', 'Failed performance run'),
    'hello\n<https://example.com/run|Failed performance run>',
  );
  // An empty label must not produce an unclickable empty link text.
  assert.equal(
    buildText('hello', 'https://example.com/run', ''),
    'hello\n<https://example.com/run|GitHub run>',
  );
});

test('postSummary addresses a user id directly, without needing im:write', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return jsonResponse({ ok: true, ts: '1789.0001' });
  };

  const result = await postSummary(
    {
      markdown: '*summary*',
      target: 'UEYQL2PEV',
      token: 'token',
      runUrl: 'https://example.com/run',
    },
    { fetchFn },
  );

  assert.deepEqual(result, { channel: 'UEYQL2PEV', ts: '1789.0001' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /chat\.postMessage$/);
  assert.equal(calls[0].body.channel, 'UEYQL2PEV');
  assert.match(calls[0].body.text, /\*summary\*/);
  assert.equal(calls[0].body.unfurl_links, false);
});

test('postSummary falls back to opening a DM when the direct post is rejected', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(url.split('/').pop());
    if (url.endsWith('chat.postMessage')) {
      const body = JSON.parse(init.body);
      if (body.channel === 'UEYQL2PEV') {
        return jsonResponse({ ok: false, error: 'channel_not_found' });
      }
      return jsonResponse({ ok: true, ts: '1789.0002' });
    }
    return jsonResponse({ ok: true, channel: { id: 'D999' } });
  };

  const result = await postSummary(
    { markdown: 'x', target: 'UEYQL2PEV', token: 'token' },
    { fetchFn },
  );

  assert.deepEqual(result, { channel: 'D999', ts: '1789.0002' });
  assert.deepEqual(calls, [
    'chat.postMessage',
    'conversations.open',
    'chat.postMessage',
  ]);
});

test('postSummary surfaces Slack errors for a channel target without retrying', async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return jsonResponse({ ok: false, error: 'channel_not_found' });
  };
  await assert.rejects(
    postSummary({ markdown: 'x', target: 'C123', token: 'token' }, { fetchFn }),
    /channel_not_found/,
  );
  assert.equal(calls.length, 1);
});
