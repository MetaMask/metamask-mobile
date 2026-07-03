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
    const only = normalizeArray(filter);
    return only.length ? only : defaultTargets;
  }

  const only = normalizeArray(filter.only);
  const skip = new Set(normalizeArray(filter.skip));

  const base = only.length ? only : defaultTargets;
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
    // eslint-disable-next-line jest/no-focused-tests -- itOnlyForPlatforms intentionally uses it.only
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
 * When define() calls itForPlatforms/itOnlyForPlatforms, those register only one test
 * for the current describe's platform (so we get exactly two runs total: ios + android).
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
      // Set scope before define() so itForPlatforms/itOnlyForPlatforms inside define
      // see the current platform and register a single it per test (not duplicate per platform).
      const previousScope = (globalThis as Record<string, unknown>)[SCOPE_KEY];
      (globalThis as Record<string, unknown>)[SCOPE_KEY] = os;
      define({ os });
      if (previousScope === undefined) {
        delete (globalThis as Record<string, unknown>)[SCOPE_KEY];
      } else {
        (globalThis as Record<string, unknown>)[SCOPE_KEY] = previousScope;
      }
    });
  }
}

/**
 * Utility to compute target platforms if you need custom loops.
 */
export function getTargetPlatforms(filter?: PlatformFilter): RNPlatform[] {
  return resolveTargetPlatforms(filter);
}

function interpolateName(name: string, row: Record<string, unknown>): string {
  return name.replace(/\$(\w+)/g, (_, key) => String(row[key] ?? ''));
}

/**
 * Like Jest's it.each, but each test runs for each targeted platform (iOS/Android).
 * Use $key in the name to interpolate row properties.
 */
export function itEach<T extends Record<string, unknown>>(table: readonly T[]) {
  return (
    name: string,
    testFn: (row: T) => void | Promise<void>,
    filter?: PlatformFilter,
  ) => {
    const targets = resolveTargetPlatforms(filter);
    for (const row of table) {
      for (const os of targets) {
        it(`${interpolateName(name, row as Record<string, unknown>)} [${os}]`, async () => {
          const originalOS = Platform.OS;
          Platform.OS = os;
          try {
            await testFn(row);
          } finally {
            Platform.OS = originalOS;
          }
        });
      }
    }
  };
}

/**
 * Like Jest's describe.each, but each describe runs for each targeted platform (iOS/Android).
 * Use $key in the name to interpolate row properties. Inside the callback, call it() to define tests.
 */
export function describeEach<T extends Record<string, unknown>>(
  table: readonly T[],
) {
  return (name: string, define: (row: T) => void, filter?: PlatformFilter) => {
    const targets = resolveTargetPlatforms(filter);
    const originalOS = Platform.OS;
    for (const row of table) {
      for (const os of targets) {
        describe(`${interpolateName(name, row as Record<string, unknown>)} [${os}]`, () => {
          beforeAll(() => {
            Platform.OS = os;
            (globalThis as Record<string, unknown>)[SCOPE_KEY] = os;
          });
          afterAll(() => {
            Platform.OS = originalOS;
            delete (globalThis as Record<string, unknown>)[SCOPE_KEY];
          });
          const previousScope = (globalThis as Record<string, unknown>)[
            SCOPE_KEY
          ];
          (globalThis as Record<string, unknown>)[SCOPE_KEY] = os;
          define(row);
          if (previousScope === undefined) {
            delete (globalThis as Record<string, unknown>)[SCOPE_KEY];
          } else {
            (globalThis as Record<string, unknown>)[SCOPE_KEY] = previousScope;
          }
        });
      }
    }
  };
}
