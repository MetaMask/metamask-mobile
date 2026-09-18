import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isUserId,
  openDirectMessage,
  buildText,
  splitForSlack,
  scenarioArtifactLinks,
  addScenarioArtifactLinks,
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

test('buildText appends the run link without cutting the body', () => {
  assert.equal(
    buildText('hello', 'https://example.com/run'),
    'hello\n<https://example.com/run|GitHub run>',
  );
  assert.equal(buildText('hello', ''), 'hello');
  assert.equal(buildText('x'.repeat(50_000), '').length, 50_000);
});

test('splitForSlack keeps every paragraph across multiple messages', () => {
  const first = 'a'.repeat(30_000);
  const second = 'b'.repeat(30_000);
  const parts = splitForSlack(`${first}\n\n${second}`, 38_000);

  assert.equal(parts.length, 2);
  assert.equal(parts.join('\n\n'), `${first}\n\n${second}`);
});

test('scenarioArtifactLinks creates sorted links for active scenario artifacts', () => {
  const links = scenarioArtifactLinks(
    [
      { id: 22, name: 'hermes-profile-02-Send', expired: false },
      { id: 11, name: 'hermes-profile-01-Perps', expired: false },
      { id: 33, name: 'app-profiling-analysis', expired: false },
      { id: 44, name: 'hermes-profile-03-Expired', expired: true },
    ],
    'MetaMask/metamask-mobile',
    '123',
  );

  assert.deepEqual(links, [
    '• <https://github.com/MetaMask/metamask-mobile/actions/runs/123/artifacts/11|hermes-profile-01-Perps>',
    '• <https://github.com/MetaMask/metamask-mobile/actions/runs/123/artifacts/22|hermes-profile-02-Send>',
  ]);
});

test('addScenarioArtifactLinks adds links to the Downloads section', () => {
  const digest = addScenarioArtifactLinks(
    '*Summary*\n\n*Downloads*\n• analysis report\n\n_Source:_ Hermes',
    ['• <https://example.com/artifact|hermes-profile-01-Perps>'],
  );

  assert.match(digest, /Per-scenario Hermes profiles/);
  assert.match(digest, /hermes-profile-01-Perps/);
  assert.ok(
    digest.indexOf('hermes-profile-01-Perps') <
      digest.indexOf('analysis report'),
  );
});

test('addScenarioArtifactLinks requires at least one scenario artifact', () => {
  assert.throws(
    () => addScenarioArtifactLinks('*Summary*', []),
    /No per-scenario Hermes profile artifacts/,
  );
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

test('postSummary threads overflow instead of truncating', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse({ ok: true, ts: `ts-${calls.length}` });
  };

  await postSummary(
    {
      markdown: `${'a'.repeat(30_000)}\n\n${'b'.repeat(30_000)}`,
      target: 'UEYQL2PEV',
      token: 'token',
      runUrl: 'https://example.com/run',
    },
    { fetchFn },
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].thread_ts, undefined);
  assert.equal(calls[1].thread_ts, 'ts-1');
  assert.doesNotMatch(calls[0].text, /Truncated for Slack/);
  assert.match(calls[1].text, /<https:\/\/example.com\/run\|GitHub run>/);
  assert.ok(calls[0].text.includes('a'.repeat(30_000)));
  assert.ok(calls[1].text.includes('b'.repeat(30_000)));
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
