/* eslint-disable dot-notation */
import { deriveSentryEnvironment } from './sentryUtils';

describe('deriveSentryEnvironment', () => {
  test('should return production-flask for environment if __DEV__ is false, METAMASK_ENVIRONMENT is production, and METAMASK_BUILD_TYPE is flask', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('production-flask');
  });

  test('should return local-flask for environment if __DEV__ is false, METAMASK_ENVIRONMENT is undefined, and METAMASK_BUILD_TYPE is flask', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, undefined, METAMASK_BUILD_TYPE);
    expect(env).toBe('local-flask');
  });

  test('should return debug-flask for environment if __DEV__ is false, METAMASK_ENVIRONMENT is debug, and METAMASK_BUILD_TYPE is flask', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const METAMASK_ENVIRONMENT = 'debug';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('debug-flask');
  });

  test('should return local for environment if __DEV__ is false, METAMASK_ENVIRONMENT is local, and METAMASK_BUILD_TYPE is undefined', async () => {
    const isDev = false;
    const METAMASK_ENVIRONMENT = 'local';

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT);
    expect(env).toBe('local');
  });

  test('should return local for environment if __DEV__ is false, and both METAMASK_ENVIRONMENT and METAMASK_BUILD_TYPE are undefined', async () => {
    const isDev = false;

    const env = deriveSentryEnvironment(isDev);
    expect(env).toBe('local');
  });

  test('should return production for environment if __DEV__ is false, METAMASK_ENVIRONMENT is production, and METAMASK_BUILD_TYPE is undefined', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, undefined);
    expect(env).toBe('production');
  });

  test('should return development for environment if __DEV__ is true', async () => {
    const isDev = true;

    const env = deriveSentryEnvironment(isDev, '', '');
    expect(env).toBe('development');
  });
});
