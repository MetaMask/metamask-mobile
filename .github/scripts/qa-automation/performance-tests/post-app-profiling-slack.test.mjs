import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isUserId,
  openDirectMessage,
  buildText,
  splitForSlack,
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

test('addScenarioArtifactLinks turns each named outcome into its download', () => {
  const digest = addScenarioArtifactLinks(
    [
      '*Conclusions*',
      '• `mod` leads *Perps open position and close it* (59058.1 ms).',
      '',
      '*Outliers*',
      '• *Predict Deposit - Complete Flow Performance* — JS 37874.6 ms',
      '• *Perps open position and close it* — JS 59058.1 ms',
      '',
      '*Downloads*',
      '• analysis report',
    ].join('\n'),
    [
      { id: 11, name: 'hermes-profile-15-Perps_open_position_and_close_it', expired: false },
      {
        id: 22,
        name: 'hermes-profile-17-Predict_Deposit_-_Complete_Flow_Performance',
        expired: false,
      },
    ],
    {
      repo: 'MetaMask/metamask-mobile',
      runId: '123',
      manifest: {
        include: [
          {
            artifactName: 'hermes-profile-15-Perps_open_position_and_close_it',
            scenario: 'Perps open position and close it',
          },
          {
            artifactName:
              'hermes-profile-17-Predict_Deposit_-_Complete_Flow_Performance',
            scenario: 'Predict Deposit - Complete Flow Performance',
          },
        ],
      },
    },
  );

  assert.match(
    digest,
    /<https:\/\/github.com\/MetaMask\/metamask-mobile\/actions\/runs\/123\/artifacts\/11\|Perps open position and close it>/,
  );
  assert.match(
    digest,
    /<https:\/\/github.com\/MetaMask\/metamask-mobile\/actions\/runs\/123\/artifacts\/22\|Predict Deposit - Complete Flow Performance>/,
  );
  assert.equal(
    digest.split('Perps open position and close it').length - 1,
    2,
  );
  assert.doesNotMatch(digest, /\*Perps open position and close it\*/);
  // The owner is named once, on the outlier, without notifying the team.
  assert.equal(
    digest.split('owner mm-perps-engineering-team').length - 1,
    1,
  );
  assert.match(digest, /owner team-predict/);
  assert.doesNotMatch(digest, /subteam|<!/);
});

test('addScenarioArtifactLinks requires at least one scenario artifact', () => {
  assert.throws(
    () =>
      addScenarioArtifactLinks('*Summary*', [], {
        repo: 'MetaMask/metamask-mobile',
        runId: '123',
        manifest: { include: [] },
      }),
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
  // Comparing the whole message keeps CodeQL from reading a URL substring
  // check as a host check, and asserts the split point at the same time.
  assert.equal(calls[0].text, 'a'.repeat(30_000));
  assert.equal(
    calls[1].text,
    `${'b'.repeat(30_000)}\n<https://example.com/run|GitHub run>`,
  );
});

test('postSummary posts weekly scenario cards in the parent thread', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse({ ok: true, ts: `ts-${calls.length}` });
  };

  await postSummary(
    {
      markdown: '*weekly index*',
      target: 'UEYQL2PEV',
      token: 'token',
      runUrl: 'https://example.com/run',
      cards: ['*Worse than last week* · *Perps add funds*'],
    },
    { fetchFn },
  );

  assert.equal(calls.length, 2);
  assert.equal(calls[0].thread_ts, undefined);
  // The parent keeps the index only; the run link belongs to the last card.
  assert.equal(calls[0].text, '*weekly index*');
  assert.equal(calls[1].thread_ts, 'ts-1');
  assert.equal(
    calls[1].text,
    '*Worse than last week* · *Perps add funds*\n<https://example.com/run|GitHub run>',
  );
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
