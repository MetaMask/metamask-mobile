import { BUILD_TYPE, OAUTH_CONFIG } from './config';
import { buildTypeMapping } from './oauthBuildType';

describe('buildTypeMapping', () => {
  const originalDevOAuth = process.env.DEV_OAUTH_CONFIG;

  afterEach(() => {
    if (originalDevOAuth === undefined) {
      delete process.env.DEV_OAUTH_CONFIG;
    } else {
      process.env.DEV_OAUTH_CONFIG = originalDevOAuth;
    }
  });

  it('returns development when DEV_OAUTH_CONFIG is true and isDev', () => {
    process.env.DEV_OAUTH_CONFIG = 'true';
    expect(buildTypeMapping('main', true, false)).toBe(BUILD_TYPE.development);
  });

  it('maps qa to main_uat', () => {
    expect(buildTypeMapping('qa', false, false)).toBe(BUILD_TYPE.main_uat);
  });

  it('maps main with QA channel to main_uat', () => {
    expect(buildTypeMapping('main', false, true)).toBe(BUILD_TYPE.main_uat);
  });

  it('maps main without QA to main_dev when isDev', () => {
    expect(buildTypeMapping('main', true, false)).toBe(BUILD_TYPE.main_dev);
  });

  it('maps main without QA to main_prod when not isDev', () => {
    expect(buildTypeMapping('main', false, false)).toBe(BUILD_TYPE.main_prod);
  });

  it('maps flask with QA channel to flask_uat', () => {
    expect(buildTypeMapping('flask', false, true)).toBe(BUILD_TYPE.flask_uat);
  });

  it('maps flask without QA to flask_dev when isDev', () => {
    expect(buildTypeMapping('flask', true, false)).toBe(BUILD_TYPE.flask_dev);
  });

  it('maps flask without QA to flask_prod when not isDev', () => {
    expect(buildTypeMapping('flask', false, false)).toBe(BUILD_TYPE.flask_prod);
  });

  it('returns development for unknown build type', () => {
    expect(buildTypeMapping('unknown', false, false)).toBe(
      BUILD_TYPE.development,
    );
  });
});

describe('resolveOAuthConfigKey', () => {
  const originalOauthBuildType = process.env.OAUTH_BUILD_TYPE;

  afterEach(() => {
    if (originalOauthBuildType === undefined) {
      delete process.env.OAUTH_BUILD_TYPE;
    } else {
      process.env.OAUTH_BUILD_TYPE = originalOauthBuildType;
    }
  });

  it('returns OAUTH_BUILD_TYPE when set to a valid config key', () => {
    jest.resetModules();
    process.env.OAUTH_BUILD_TYPE = BUILD_TYPE.main_prod;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- Jest reload after resetModules; dynamic import needs experimental-vm-modules
    const { resolveOAuthConfigKey } = require('./oauthBuildType');
    expect(resolveOAuthConfigKey()).toBe(BUILD_TYPE.main_prod);
  });

  it('ignores OAUTH_BUILD_TYPE when not a key of OAUTH_CONFIG', () => {
    jest.resetModules();
    process.env.OAUTH_BUILD_TYPE = 'not_a_real_key';
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { resolveOAuthConfigKey } = require('./oauthBuildType');
    const key = resolveOAuthConfigKey();
    expect(key).not.toBe('not_a_real_key');
    expect(key in OAUTH_CONFIG).toBe(true);
  });
});
