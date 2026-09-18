/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseArgs,
  listRunArtifacts,
  scenarioDownloadMap,
  linkScenarioNames,
} from './link-scenario-artifacts.mjs';

const ARTIFACTS = [
  {
    id: 11,
    name: 'hermes-profile-15-Perps_open_position_and_close_it',
    expired: false,
  },
  {
    id: 22,
    name: 'hermes-profile-17-Predict_Deposit_-_Complete_Flow_Performance',
    expired: false,
  },
  { id: 33, name: 'app-profiling-analysis', expired: false },
  { id: 44, name: 'hermes-profile-14-Perps_add_funds', expired: true },
];

const MANIFEST = {
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
    {
      artifactName: 'hermes-profile-14-Perps_add_funds',
      scenario: 'Perps add funds',
    },
  ],
};

test('parseArgs reads the output path, style and optional flag', () => {
  const args = parseArgs([
    'in.md',
    'out.md',
    '--style',
    'markdown',
    '--optional',
  ]);

  assert.equal(args.input, 'in.md');
  assert.equal(args.output, 'out.md');
  assert.equal(args.style, 'markdown');
  assert.equal(args.optional, true);
});

test('parseArgs defaults to Slack style and rewrites in place', () => {
  const args = parseArgs(['digest.md']);

  assert.equal(args.output, 'digest.md');
  assert.equal(args.style, 'slack');
  assert.equal(args.optional, false);
});

test('scenarioDownloadMap skips expired and non-scenario artifacts', () => {
  const mappings = scenarioDownloadMap(
    ARTIFACTS,
    MANIFEST,
    'MetaMask/metamask-mobile',
    '123',
  );

  assert.deepEqual(
    mappings.map((mapping) => mapping.scenario),
    [
      'Predict Deposit - Complete Flow Performance',
      'Perps open position and close it',
    ],
  );
  assert.equal(
    mappings[1].url,
    'https://github.com/MetaMask/metamask-mobile/actions/runs/123/artifacts/11',
  );
});

test('linkScenarioNames renders GitHub markdown links for the run page', () => {
  const linked = linkScenarioNames(
    '## Predict Deposit - Complete Flow Performance\n\n| JS work | 37874.6 ms |',
    scenarioDownloadMap(ARTIFACTS, MANIFEST, 'MetaMask/metamask-mobile', '123'),
    { style: 'markdown' },
  );

  assert.match(
    linked,
    /\[Predict Deposit - Complete Flow Performance\]\(https:\/\/github.com\/MetaMask\/metamask-mobile\/actions\/runs\/123\/artifacts\/22\)/,
  );
});

test('linkScenarioNames leaves an already linked scenario alone', () => {
  const mappings = scenarioDownloadMap(
    ARTIFACTS,
    MANIFEST,
    'MetaMask/metamask-mobile',
    '123',
  );
  const once = linkScenarioNames('• *Perps open position and close it*', mappings);
  const twice = linkScenarioNames(once, mappings);

  assert.equal(once, twice);
  assert.equal(once.split('artifacts/11').length - 1, 1);
});

test('listRunArtifacts surfaces a GitHub API failure', async () => {
  await assert.rejects(
    listRunArtifacts('MetaMask/metamask-mobile', '123', 'token', {
      fetchFn: async () => ({ ok: false, status: 403 }),
    }),
    /GitHub artifacts HTTP 403/,
  );
});
