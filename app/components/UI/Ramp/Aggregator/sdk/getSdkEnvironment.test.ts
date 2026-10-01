import { Environment } from '@consensys/on-ramp-sdk';
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
    ['dev', Environment.Staging],
    ['uat', Environment.Staging],
    ['prod', Environment.Production],
  ] as const)('maps MM_API_ENV=%s to %s', (apiEnv, expected) => {
    process.env.MM_API_ENV = apiEnv;

    expect(getSdkEnvironment()).toBe(expected);
  });

  it('returns Production when MM_API_ENV is unset', () => {
    delete process.env.MM_API_ENV;

    expect(getSdkEnvironment()).toBe(Environment.Production);
  });

  it('returns Production for an unrecognized MM_API_ENV', () => {
    process.env.MM_API_ENV = 'unknown';

    expect(getSdkEnvironment()).toBe(Environment.Production);
  });

  it('accepts uppercase values', () => {
    process.env.MM_API_ENV = 'PROD';

    expect(getSdkEnvironment()).toBe(Environment.Production);
  });

  it('returns the same result for the same input', () => {
    process.env.MM_API_ENV = 'prod';

    expect(getSdkEnvironment()).toBe(getSdkEnvironment());
  });
});
