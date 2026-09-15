import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isUserId,
  resolveChannel,
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

test('resolveChannel opens a DM for a user id', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return jsonResponse({ ok: true, channel: { id: 'D123RESOLVED' } });
  };

  const channel = await resolveChannel('UEYQL2PEV', 'token', { fetchFn });

  assert.equal(channel, 'D123RESOLVED');
  assert.match(calls[0].url, /conversations\.open$/);
  assert.equal(calls[0].body.users, 'UEYQL2PEV');
});

test('resolveChannel passes channel ids straight through', async () => {
  const fetchFn = async () => {
    throw new Error('should not call Slack for a channel id');
  };
  assert.equal(
    await resolveChannel('C0BTXK2MAE5', 'token', { fetchFn }),
    'C0BTXK2MAE5',
  );
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

test('postSummary opens the DM then posts with unfurling disabled', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.endsWith('conversations.open')) {
      return jsonResponse({ ok: true, channel: { id: 'D999' } });
    }
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

  assert.deepEqual(result, { channel: 'D999', ts: '1789.0001' });
  const post = calls[1];
  assert.match(post.url, /chat\.postMessage$/);
  assert.equal(post.body.channel, 'D999');
  assert.match(post.body.text, /\*summary\*/);
  assert.equal(post.body.unfurl_links, false);
});

test('postSummary surfaces Slack API errors', async () => {
  const fetchFn = async () => jsonResponse({ ok: false, error: 'channel_not_found' });
  await assert.rejects(
    postSummary(
      { markdown: 'x', target: 'C123', token: 'token' },
      { fetchFn },
    ),
    /channel_not_found/,
  );
});
