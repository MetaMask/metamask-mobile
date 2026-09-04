import {
  assertPoolModeAppPath,
  assertPoolModeWdaArtifacts,
  buildPrepareIosGithubOutput,
  resolvePoolWdaPreinstallState,
} from './prepare-ios-appium-runner-lib.mjs';

describe('assertPoolModeAppPath', () => {
  it('allows N=1 without an app path', () => {
    expect(() => assertPoolModeAppPath(1, undefined)).not.toThrow();
  });

  it('requires an app path in pool mode', () => {
    expect(() => assertPoolModeAppPath(2, undefined)).toThrow(
      'IOS_APP_PATH is required for iOS device pool mode.',
    );
  });
});

describe('assertPoolModeWdaArtifacts', () => {
  it('allows N=1 without WDA artifacts', () => {
    expect(() => assertPoolModeWdaArtifacts(1, undefined)).not.toThrow();
  });

  it('requires WDA artifacts in pool mode', () => {
    expect(() => assertPoolModeWdaArtifacts(2, undefined)).toThrow(
      'WDA artifacts are required for iOS device pool mode, but none were found.',
    );
  });
});

describe('resolvePoolWdaPreinstallState', () => {
  it('marks preinstalled when every bundle id is present', () => {
    expect(
      resolvePoolWdaPreinstallState(2, [
        'com.facebook.WebDriverAgentRunner',
        'com.facebook.WebDriverAgentRunner',
      ]),
    ).toEqual({
      iosWdaPreinstalled: 'true',
      iosWdaBundleIdBase: 'com.facebook.WebDriverAgentRunner',
    });
  });

  it('fails closed when any pool simulator lacks WDA', () => {
    expect(() =>
      resolvePoolWdaPreinstallState(2, [
        'com.facebook.WebDriverAgentRunner',
        '',
      ]),
    ).toThrow('WDA must be preinstalled on every iOS pool simulator.');
  });

  it('keeps N=1 able to fall back when WDA is missing', () => {
    expect(resolvePoolWdaPreinstallState(1, [''])).toEqual({
      iosWdaPreinstalled: 'false',
      iosWdaBundleIdBase: '',
    });
  });
});

describe('buildPrepareIosGithubOutput', () => {
  it('omits ios-device-pool for N=1', () => {
    expect(
      buildPrepareIosGithubOutput({
        primaryUdid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        poolSize: 1,
        udids: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
        iosWdaPreinstalled: 'true',
        iosWdaBundleIdBase: 'com.facebook.WebDriverAgentRunner',
      }),
    ).toBe(
      [
        'ios-simulator-udid=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'ios-wda-preinstalled=true',
        'ios-wda-bundle-id=com.facebook.WebDriverAgentRunner',
        '',
      ].join('\n'),
    );
  });

  it('emits ios-device-pool for N=2', () => {
    expect(
      buildPrepareIosGithubOutput({
        primaryUdid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        poolSize: 2,
        udids: [
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        ],
        iosWdaPreinstalled: 'true',
        iosWdaBundleIdBase: 'com.facebook.WebDriverAgentRunner',
      }),
    ).toContain(
      'ios-device-pool=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa,bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\n',
    );
  });
});
