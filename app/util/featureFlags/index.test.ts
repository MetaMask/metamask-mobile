import launchDarklyURL from './';

describe('launchDarklyURL', () => {
  it('returns the correct URL when metamaskBuildType is main and metamaskEnvironment is production', () => {
    expect(launchDarklyURL('main', 'production')).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskBuildType is flask and metamaskEnvironment is local', () => {
    expect(launchDarklyURL('flask', 'local')).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=flask&environment=dev`,
    );
  });

  it('returns the correct URL when metamaskBuildType is not defined', () => {
    expect(launchDarklyURL()).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskEnvironment is not defined', () => {
    expect(launchDarklyURL('main')).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskBuildType is invalid', () => {
    expect(launchDarklyURL('invalid', 'production')).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });

  it('returns the correct URL when metamaskEnvironment is invalid', () => {
    expect(launchDarklyURL('main', 'invalid')).toBe(
      `${process.env.LAUNCH_DARKLY_URL}/flags?client=mobile&distribution=main&environment=prod`,
    );
  });
});
