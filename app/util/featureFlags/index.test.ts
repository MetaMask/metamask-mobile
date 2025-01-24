import launchDarklyURL from './';
import AppConstants from '../../core/AppConstants';

const baseURL = AppConstants.FEATURE_FLAGS_API.BASE_URL;
const version = AppConstants.FEATURE_FLAGS_API.VERSION;

describe('launchDarklyURL', () => {
  it('returns the default URL when metamaskBuildType is not defined', () => {
    expect(launchDarklyURL()).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskEnvironment is not defined', () => {
    expect(launchDarklyURL('main')).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskBuildType is main and metamaskEnvironment is production', () => {
    expect(launchDarklyURL('main', 'production')).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskBuildType is flask and metamaskEnvironment is local', () => {
    expect(launchDarklyURL('flask', 'local')).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=flask&environment=dev`,
    );
  });

  it('returns the correct URL when metamaskBuildType is invalid', () => {
    expect(launchDarklyURL('invalid', 'production')).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskEnvironment is invalid', () => {
    expect(launchDarklyURL('main', 'invalid')).toBe(
      `${baseURL}/${version}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });
});
