import { SdkEnvironment } from '../types/legacyDeposit';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalApiEnv = process.env.MM_API_ENV;

  afterEach(() => {
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  it.each([
    ['dev', SdkEnvironment.Staging],
    ['uat', SdkEnvironment.Staging],
    ['prod', SdkEnvironment.Production],
  ] as const)('maps MM_API_ENV=%s to %s', (apiEnv, expected) => {
    process.env.MM_API_ENV = apiEnv;

    expect(getSdkEnvironment()).toBe(expected);
  });

  it('returns Production when MM_API_ENV is unset', () => {
    delete process.env.MM_API_ENV;

    expect(getSdkEnvironment()).toBe(SdkEnvironment.Production);
  });

  it('returns Production for an unrecognized MM_API_ENV', () => {
    process.env.MM_API_ENV = 'unknown-env';

    expect(getSdkEnvironment()).toBe(SdkEnvironment.Production);
  });

  it('accepts uppercase values', () => {
    process.env.MM_API_ENV = 'DEV';

    expect(getSdkEnvironment()).toBe(SdkEnvironment.Staging);
  });
});
