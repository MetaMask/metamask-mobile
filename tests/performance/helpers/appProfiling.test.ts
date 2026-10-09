import type { TestInfo } from '@playwright/test';
import {
  collectAppProfiling,
  isHermesCpuProfileCollectionEnabled,
} from './appProfiling.ts';

describe('isHermesCpuProfileCollectionEnabled', () => {
  // Bracket access — babel transform-inline-environment-variables must not
  // bake these reads/writes or afterEach cleanup becomes `delete undefined`.
  const envKey = 'COLLECT_HERMES_CPUPROFILES';
  const previous = process.env[envKey];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is unset', () => {
    delete process.env[envKey];

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is false', () => {
    process.env[envKey] = 'false';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is 1', () => {
    process.env[envKey] = '1';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns true only when COLLECT_HERMES_CPUPROFILES is true', () => {
    process.env[envKey] = 'true';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(true);
  });
});

describe('collectAppProfiling', () => {
  const envKey = 'COLLECT_HERMES_CPUPROFILES';
  const previous = process.env[envKey];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  it('returns 0 without pulling when Hermes collection is disabled', async () => {
    delete process.env[envKey];
    const testInfo = { title: 'example' } as TestInfo;

    const collected = await collectAppProfiling(testInfo, 'android');

    expect(collected).toBe(0);
  });
});
