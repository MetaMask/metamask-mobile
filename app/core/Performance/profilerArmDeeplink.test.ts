import {
  buildProfilerArmDeeplink,
  isProfilerArmDeeplink,
  parseProfilerArmDeeplink,
  PROFILER_ARM_DEEPLINK_PREFIX,
} from './profilerArmDeeplink';

describe('profilerArmDeeplink', () => {
  it('recognizes only the profiler arm path', () => {
    expect(
      isProfilerArmDeeplink(`${PROFILER_ARM_DEEPLINK_PREFIX}?nonce=a`),
    ).toBe(true);
    expect(isProfilerArmDeeplink('metamask://e2e/perps/push-price')).toBe(
      false,
    );
    expect(isProfilerArmDeeplink('metamask://home')).toBe(false);
  });

  it('round-trips nonce and scope', () => {
    const url = buildProfilerArmDeeplink({
      nonce: 'abc123',
      scope: 'next-process',
    });

    expect(parseProfilerArmDeeplink(url)).toEqual({
      nonce: 'abc123',
      scope: 'next-process',
    });
  });

  it('defaults an unknown scope to now', () => {
    expect(
      parseProfilerArmDeeplink(
        `${PROFILER_ARM_DEEPLINK_PREFIX}?nonce=abc&scope=later`,
      ),
    ).toEqual({ nonce: 'abc', scope: 'now' });
  });

  it('rejects an arm URL without a nonce', () => {
    expect(parseProfilerArmDeeplink(PROFILER_ARM_DEEPLINK_PREFIX)).toBeNull();
  });
});
