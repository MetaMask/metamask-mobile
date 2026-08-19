import {
  buildBuildLinksSection,
  buildCommentBody,
  buildMoreInfoSection,
  buildOtaUpdateSection,
} from './comment-body';
import { parseBuildInfo, RC_BUILD_COMMENT_MARKER } from './utils';
import type { WhatsInRcResult } from './cherry-picks-section';
import type { BuildInfo, OtaUpdateInfo } from './types';

const NATIVE_BUILD: BuildInfo = {
  semver: '8.0.1',
  iosBuildNumber: '2413',
  androidBuildNumber: '2413',
  pipelineUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/1',
  androidPublicUrl: 'https://example.com/app.apk',
};

const OTA_UPDATE: OtaUpdateInfo = {
  commitShortSha: 'a1b2c3d',
  nativeBuildNumber: '2413',
  baselineShortSha: 'f0e9d8c',
};

const OTA_BUILD: BuildInfo = {
  semver: '8.0.1',
  iosBuildNumber: 'Unknown',
  androidBuildNumber: 'Unknown',
  pipelineUrl: 'https://github.com/MetaMask/metamask-mobile/actions/runs/2',
  otaUpdate: OTA_UPDATE,
};

const noExtras = {
  envValidation: {},
  whatsInRc: {},
};

describe('buildOtaUpdateSection', () => {
  it('reports the commit and the native build it runs on', () => {
    const section = buildOtaUpdateSection(OTA_UPDATE);

    expect(section).toContain('`a1b2c3d`');
    expect(section).toContain('`2413`');
    expect(section).toContain('`f0e9d8c`');
  });

  it('says there is nothing to install', () => {
    expect(buildOtaUpdateSection(OTA_UPDATE)).toContain(
      'there is nothing new to install',
    );
  });

  it('tells testers what the app will show', () => {
    expect(buildOtaUpdateSection(OTA_UPDATE)).toContain('ota a1b2c3d');
  });
});

describe('buildMoreInfoSection', () => {
  it('lists build numbers for a native build', () => {
    const section = buildMoreInfoSection(NATIVE_BUILD);

    expect(section).toContain('**iOS Build Number**: `2413`');
    expect(section).toContain('**Android Build Number**: `2413`');
    expect(section).not.toContain('OTA Commit');
  });

  it('lists the commit instead of build numbers for an OTA update', () => {
    const section = buildMoreInfoSection(OTA_BUILD);

    expect(section).toContain('**OTA Commit**: `a1b2c3d`');
    expect(section).toContain('**Native Build Number**: `2413` (`f0e9d8c`)');
    // Those would read "Unknown" on this path, which is worse than not showing them.
    expect(section).not.toContain('iOS Build Number');
    expect(section).not.toContain('Android Build Number');
  });
});

describe('buildCommentBody', () => {
  it('renders the native comment with download links', () => {
    const body = buildCommentBody(
      NATIVE_BUILD,
      null,
      noExtras.envValidation,
      noExtras.whatsInRc,
    );

    expect(body).toContain(RC_BUILD_COMMENT_MARKER);
    expect(body).toContain('RC Builds Ready for Testing');
    expect(body).toContain('TestFlight');
    expect(body).toContain('https://example.com/app.apk');
  });

  it('renders the OTA comment without download links', () => {
    const body = buildCommentBody(
      OTA_BUILD,
      null,
      noExtras.envValidation,
      noExtras.whatsInRc,
    );

    expect(body).toContain(RC_BUILD_COMMENT_MARKER);
    expect(body).toContain('RC OTA Update Published');
    expect(body).toContain('`a1b2c3d`');
    expect(body).not.toContain('RC Builds Ready for Testing');
    expect(body).not.toContain('TestFlight');
    expect(body).not.toContain(buildBuildLinksSection(OTA_BUILD));
  });

  it('anchors the RC notes on the commit for an OTA update, so Slack links to this comment', () => {
    const whatsInRc: { result: WhatsInRcResult } = {
      result: {
        cherryPicks: [{ hash: 'deadbee', subject: 'fix: a thing' }],
        changelog: [],
        mergeBase: 'c0ffee0',
        previousTag: 'v8.0.0',
        changelogFromReleaseBranch: true,
      },
    };

    const otaBody = buildCommentBody(
      OTA_BUILD,
      null,
      noExtras.envValidation,
      whatsInRc,
    );
    const nativeBody = buildCommentBody(
      NATIVE_BUILD,
      null,
      noExtras.envValidation,
      whatsInRc,
    );

    expect(otaBody).toContain('id="whats-in-this-rc-a1b2c3d"');
    expect(nativeBody).toContain('id="whats-in-this-rc-2413"');
  });
});

describe('parseBuildInfo', () => {
  const ENV_KEYS = [
    'SEMVER',
    'IOS_BUILD_NUMBER',
    'ANDROID_BUILD_NUMBER',
    'OTA_COMMIT_SHORT_SHA',
    'OTA_NATIVE_BUILD_NUMBER',
    'OTA_BASELINE_SHORT_SHA',
  ];
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it('reports no OTA update for a native build', () => {
    process.env.SEMVER = '8.0.1';
    process.env.IOS_BUILD_NUMBER = '2413';

    expect(parseBuildInfo().otaUpdate).toBeUndefined();
  });

  it('reads the OTA update when CI published one', () => {
    process.env.SEMVER = '8.0.1';
    process.env.OTA_COMMIT_SHORT_SHA = 'a1b2c3d';
    process.env.OTA_NATIVE_BUILD_NUMBER = '2413';
    process.env.OTA_BASELINE_SHORT_SHA = 'f0e9d8c';

    expect(parseBuildInfo().otaUpdate).toStrictEqual({
      commitShortSha: 'a1b2c3d',
      nativeBuildNumber: '2413',
      baselineShortSha: 'f0e9d8c',
    });
  });

  it('ignores a blank commit, since unset workflow inputs arrive as empty strings', () => {
    process.env.SEMVER = '8.0.1';
    process.env.OTA_COMMIT_SHORT_SHA = '   ';

    expect(parseBuildInfo().otaUpdate).toBeUndefined();
  });

  it('falls back to Unknown for missing baseline details', () => {
    process.env.SEMVER = '8.0.1';
    process.env.OTA_COMMIT_SHORT_SHA = 'a1b2c3d';

    expect(parseBuildInfo().otaUpdate).toStrictEqual({
      commitShortSha: 'a1b2c3d',
      nativeBuildNumber: 'Unknown',
      baselineShortSha: 'Unknown',
    });
  });
});
