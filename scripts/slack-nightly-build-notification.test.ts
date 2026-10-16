/**
 * Unit tests for the pure message builder and metadata loader in
 * slack-nightly-build-notification.ts. Network calls (postToSlack) are
 * exercised via SLACK_NIGHTLY_NOTIFICATION_DRY_RUN in the workflow itself,
 * not here.
 */

import { buildNightlySlackMessage, loadMetadata, type NightlyBuildMetadata } from './slack-nightly-build-notification';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const fs = require('fs');

afterEach(() => {
  jest.mocked(fs.readFileSync).mockReset();
  jest.mocked(fs.existsSync).mockReset();
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

function buildMetadata(overrides: Partial<NightlyBuildMetadata['builds']> = {}): NightlyBuildMetadata {
  return {
    run_id: '999',
    run_url: 'https://github.com/MetaMask/metamask-mobile/actions/runs/999',
    triggered_sha: 'fedcba0987654321',
    generated_at: '2026-10-16T04:00:00.000Z',
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

    expect(blocksText(payload)).toContain('https://testflight.apple.com/join/hBrjtFuA');
  });

  it('links each build to its own commit, even when RC and EXP differ', () => {
    const metadata = buildMetadata({
      'android-rc': { ...SUCCESS_ENTRY, commit_sha: '1111111aaaaaaa' },
      'android-exp': { ...SUCCESS_ENTRY, commit_sha: '2222222bbbbbbb' },
    });

    const payload = buildNightlySlackMessage(metadata, links, { repoUrl: 'https://github.com/MetaMask/metamask-mobile' });

    expect(blocksText(payload)).toContain('https://github.com/MetaMask/metamask-mobile/commit/1111111aaaaaaa');
    expect(blocksText(payload)).toContain('https://github.com/MetaMask/metamask-mobile/commit/2222222bbbbbbb');
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
