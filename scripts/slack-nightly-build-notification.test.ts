/**
 * Unit tests for the pure message builder and metadata loader in
 * slack-nightly-build-notification.ts. Network calls (postToSlack) are
 * exercised via SLACK_NIGHTLY_NOTIFICATION_DRY_RUN in the workflow itself,
 * not here.
 */

import {
  buildNightlySlackMessage,
  loadMetadata,
  loadPreviousMetadata,
  resolvePreviousCommits,
  type NightlyBuildMetadata,
} from './slack-nightly-build-notification';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const fs = require('fs');

afterEach(() => {
  jest.mocked(fs.readFileSync).mockReset();
  jest.mocked(fs.existsSync).mockReset();
  jest.mocked(fs.readdirSync).mockReset();
});

function blocksText(payload: { blocks: object[] }): string {
  return JSON.stringify(payload.blocks);
}

function fieldTexts(payload: { blocks: object[] }): string[] {
  return payload.blocks
    .filter((block): block is { type: string; fields: { text: string }[] } => (block as { type: string }).type === 'section' && 'fields' in block)
    .flatMap((block) => block.fields.map((field) => field.text));
}

const SUCCESS_ENTRY = {
  result: 'success',
  version: '7.80.0',
  build_number: '1234',
  commit_sha: 'abcdef1234567890',
};

function buildMetadata(
  overrides: Partial<NightlyBuildMetadata['builds']> = {},
  run: { runId?: string; generatedAt?: string } = {},
): NightlyBuildMetadata {
  const runId = run.runId ?? '999';
  return {
    run_id: runId,
    run_url: `https://github.com/MetaMask/metamask-mobile/actions/runs/${runId}`,
    triggered_sha: 'fedcba0987654321',
    generated_at: run.generatedAt ?? '2026-10-16T04:00:00.000Z',
    builds: {
      'ios-exp': { ...SUCCESS_ENTRY },
      'ios-rc': { ...SUCCESS_ENTRY },
      'android-exp': { ...SUCCESS_ENTRY },
      'android-rc': { ...SUCCESS_ENTRY },
      ...overrides,
    },
  };
}

describe('loadMetadata', () => {
  it('parses a valid metadata file', () => {
    fs.readFileSync.mockReturnValue(JSON.stringify(buildMetadata()));

    const metadata = loadMetadata('nightly-build-metadata.json');

    expect(metadata.run_id).toBe('999');
    expect(metadata.builds['android-rc'].version).toBe('7.80.0');
  });

  it('defaults a missing build entry instead of throwing', () => {
    const builds: Partial<NightlyBuildMetadata['builds']> = buildMetadata().builds;
    delete builds['ios-rc'];
    fs.readFileSync.mockReturnValue(JSON.stringify({ ...buildMetadata(), builds }));

    const metadata = loadMetadata('nightly-build-metadata.json');

    expect(metadata.builds['ios-rc']).toEqual({
      result: null,
      version: null,
      build_number: null,
      commit_sha: null,
    });
  });

  it('defaults generated_at when missing', () => {
    const raw: Partial<NightlyBuildMetadata> = buildMetadata();
    delete raw.generated_at;
    fs.readFileSync.mockReturnValue(JSON.stringify(raw));

    const metadata = loadMetadata('nightly-build-metadata.json');

    expect(typeof metadata.generated_at).toBe('string');
    expect(metadata.generated_at.length).toBeGreaterThan(0);
  });
});

describe('loadPreviousMetadata', () => {
  it('returns an empty list when the directory does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    expect(loadPreviousMetadata('previous-nightly-metadata')).toEqual([]);
  });

  it('loads every run with a metadata file, newest first', () => {
    const older = buildMetadata({}, { runId: '1', generatedAt: '2026-10-17T05:00:00.000Z' });
    const newer = buildMetadata({}, { runId: '2', generatedAt: '2026-10-18T05:00:00.000Z' });
    fs.existsSync.mockImplementation((path: string) => !path.includes('/3/'));
    fs.readdirSync.mockReturnValue(['1', '2', '3']);
    fs.readFileSync.mockImplementation((path: string) => JSON.stringify(path.includes('/1/') ? older : newer));

    const previous = loadPreviousMetadata('previous-nightly-metadata');

    expect(previous.map((run) => run.run_id)).toEqual(['2', '1']);
  });
});

describe('resolvePreviousCommits', () => {
  it('uses the most recent earlier run where the same build succeeded', () => {
    const lastNight = buildMetadata(
      {
        'ios-rc': { result: 'failure', version: null, build_number: null, commit_sha: null },
        'android-rc': { ...SUCCESS_ENTRY, commit_sha: 'android-last-night' },
      },
      { runId: '2', generatedAt: '2026-10-18T05:00:00.000Z' },
    );
    const twoNightsAgo = buildMetadata(
      { 'ios-rc': { ...SUCCESS_ENTRY, commit_sha: 'ios-two-nights-ago' } },
      { runId: '1', generatedAt: '2026-10-17T05:00:00.000Z' },
    );

    const commits = resolvePreviousCommits([lastNight, twoNightsAgo], '3');

    expect(commits['ios-rc']).toBe('ios-two-nights-ago');
    expect(commits['android-rc']).toBe('android-last-night');
  });

  it('ignores the current run if it is in the list', () => {
    const current = buildMetadata({ 'ios-exp': { ...SUCCESS_ENTRY, commit_sha: 'current' } }, { runId: '3' });

    const commits = resolvePreviousCommits([current], '3');

    expect(commits['ios-exp']).toBeUndefined();
  });

  it('falls back to the given SHA when no earlier run covers a build', () => {
    const commits = resolvePreviousCommits([], '3', 'previous-run-head');

    expect(commits).toEqual({
      'ios-exp': 'previous-run-head',
      'ios-rc': 'previous-run-head',
      'android-exp': 'previous-run-head',
      'android-rc': 'previous-run-head',
    });
  });
});

describe('buildNightlySlackMessage', () => {
  const links = {
    androidRcUrl: 'https://app.runway.team/bucket/android-rc',
    androidExpUrl: 'https://app.runway.team/bucket/android-exp',
    iosRcUrl: 'https://app.runway.team/bucket/ios-rc',
    iosExpUrl: 'https://app.runway.team/bucket/ios-exp',
  };

  it('always uses the fixed header text regardless of inputs', () => {
    const { text } = buildNightlySlackMessage(buildMetadata(), links);

    expect(text).toBe(':iphone: :rocketship: Nightly Builds from main branch available');
  });

  it('includes the version and build number for every successful build', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    const texts = fieldTexts(payload);
    expect(texts.filter((t) => t.includes('v7.80.0 (build 1234)'))).toHaveLength(4);
  });

  it('links each platform to its own Runway bucket', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    expect(blocksText(payload)).toContain(links.androidRcUrl);
    expect(blocksText(payload)).toContain(links.androidExpUrl);
    expect(blocksText(payload)).toContain(links.iosRcUrl);
    expect(blocksText(payload)).toContain(links.iosExpUrl);
  });

  it('links the iOS builds to TestFlight', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    expect(blocksText(payload)).toContain('https://testflight.apple.com/join|TestFlight');
    expect(blocksText(payload)).not.toContain('hBrjtFuA');
  });

  it('links each build to the commit history at its own commit, even when RC and EXP differ', () => {
    const metadata = buildMetadata({
      'android-rc': { ...SUCCESS_ENTRY, commit_sha: '1111111aaaaaaa' },
      'android-exp': { ...SUCCESS_ENTRY, commit_sha: '2222222bbbbbbb' },
    });

    const payload = buildNightlySlackMessage(metadata, links, { repoUrl: 'https://github.com/MetaMask/metamask-mobile' });

    expect(blocksText(payload)).toContain('https://github.com/MetaMask/metamask-mobile/commits/1111111aaaaaaa/|1111111>');
    expect(blocksText(payload)).toContain('https://github.com/MetaMask/metamask-mobile/commits/2222222bbbbbbb/|2222222>');
  });

  it('links to the changes since the previous nightly of the same build', () => {
    const metadata = buildMetadata({ 'android-rc': { ...SUCCESS_ENTRY, commit_sha: 'newsha' } });

    const payload = buildNightlySlackMessage(metadata, links, {
      repoUrl: 'https://github.com/MetaMask/metamask-mobile',
      previousCommits: { 'android-rc': 'oldsha' },
    });

    expect(blocksText(payload)).toContain(
      '<https://github.com/MetaMask/metamask-mobile/compare/oldsha...newsha|Changes since last nightly>',
    );
  });

  it('says there are no changes when the previous nightly built the same commit', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links, {
      previousCommits: { 'ios-exp': SUCCESS_ENTRY.commit_sha },
    });

    expect(blocksText(payload)).toContain('No changes since last nightly');
    expect(blocksText(payload)).not.toContain('/compare/');
  });

  it('omits the compare link when there is no previous commit', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    expect(blocksText(payload)).not.toContain('since last nightly');
  });

  it('shows a build-failed warning instead of version/build number for a failed build', () => {
    const metadata = buildMetadata({
      'ios-rc': { result: 'failure', version: null, build_number: null, commit_sha: null },
    });

    const payload = buildNightlySlackMessage(metadata, links);

    const texts = fieldTexts(payload);
    expect(texts.some((t) => t.includes(':warning:'))).toBe(true);
    expect(texts.some((t) => t.includes('build failure'))).toBe(true);
  });

  it('shows "not configured" instead of a broken link when a Runway URL is missing', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), {});

    expect(blocksText(payload)).toContain('link not configured');
  });

  it('includes a date block derived from generated_at', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    expect(blocksText(payload)).toContain('<!date^');
  });

  it('includes a link to the triggering workflow run', () => {
    const metadata = buildMetadata();
    const payload = buildNightlySlackMessage(metadata, links);

    expect(blocksText(payload)).toContain(metadata.run_url);
  });

  it('includes the LaunchDarkly link for both the RC and EXP sections', () => {
    const payload = buildNightlySlackMessage(buildMetadata(), links);

    expect(blocksText(payload)).toContain('selected-env=qa-prod|main-rc>');
    expect(blocksText(payload)).toContain('selected-env=main-exp|main-exp>');
  });
});
