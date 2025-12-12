import { Platform } from 'react-native';

export type RNPlatform = 'ios' | 'android';

type PlatformFilter =
  | RNPlatform
  | RNPlatform[]
  | { only?: RNPlatform | RNPlatform[]; skip?: RNPlatform[] };

const SCOPE_KEY = '__MM_TEST_PLATFORM_SCOPE__';

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getDefaultPlatforms(): RNPlatform[] {
  const scoped = (globalThis as Record<string, unknown>)[SCOPE_KEY] as
    | RNPlatform
    | undefined;
  if (scoped === 'ios' || scoped === 'android') {
    return [scoped];
  }
  const env = (process.env.TEST_OS ?? '').toLowerCase();
  if (env === 'ios' || env === 'android') {
    return [env as RNPlatform];
  }
  return ['ios', 'android'];
}

function resolveTargetPlatforms(filter?: PlatformFilter): RNPlatform[] {
  const defaultTargets = getDefaultPlatforms();

  if (!filter) {
    return defaultTargets;
  }

  if (typeof filter === 'string' || Array.isArray(filter)) {
    const only = normalizeArray(filter) as RNPlatform[];
    return only.length ? only : defaultTargets;
  }

  const only = normalizeArray(filter.only) as RNPlatform[];
  const skip = new Set(normalizeArray(filter.skip) as RNPlatform[]);

  const base = (only.length ? only : defaultTargets) as RNPlatform[];
  return base.filter((p) => !skip.has(p));
}

/**
 * Runs a test body for each targeted platform, defaulting to both iOS and Android.
 * Use TEST_OS=ios|android to globally filter, or the filter parameter to narrow per test.
 */
export function itForPlatforms(
  name: string,
  testFn: (ctx: { os: RNPlatform }) => void | Promise<void>,
  filter?: PlatformFilter,
) {
  const targets = resolveTargetPlatforms(filter);
  for (const os of targets) {
    it(`${name} [${os}]`, async () => {
      const originalOS = Platform.OS;
      Platform.OS = os;
      try {
        await testFn({ os });
      } finally {
        Platform.OS = originalOS;
      }
    });
  }
}

/**
 * Same as itForPlatforms but focused (runs only these tests).
 */
export function itOnlyForPlatforms(
  name: string,
  testFn: (ctx: { os: RNPlatform }) => void | Promise<void>,
  filter?: PlatformFilter,
) {
  const targets = resolveTargetPlatforms(filter);
  for (const os of targets) {
    it.only(`${name} [${os}]`, async () => {
      const originalOS = Platform.OS;
      Platform.OS = os;
      try {
        await testFn({ os });
      } finally {
        Platform.OS = originalOS;
      }
    });
  }
}

/**
 * Group tests under a describe for each targeted platform.
 */
export function describeForPlatforms(
  name: string,
  define: (ctx: { os: RNPlatform }) => void,
  filter?: PlatformFilter,
) {
  const targets = resolveTargetPlatforms(filter);
  const originalOS = Platform.OS;
  for (const os of targets) {
    describe(`${name} [${os}]`, () => {
      beforeAll(() => {
        Platform.OS = os;
        (globalThis as Record<string, unknown>)[SCOPE_KEY] = os;
      });
      afterAll(() => {
        Platform.OS = originalOS;
        delete (globalThis as Record<string, unknown>)[SCOPE_KEY];
      });
      define({ os });
    });
  }
}

/**
 * Utility to compute target platforms if you need custom loops.
 */
export function getTargetPlatforms(filter?: PlatformFilter): RNPlatform[] {
  return resolveTargetPlatforms(filter);
}
