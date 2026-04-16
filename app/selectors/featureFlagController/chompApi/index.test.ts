import { selectChompApiConfig, selectChompApiBaseUrl } from '.';

describe('selectChompApiConfig', () => {
  it('returns remote config when present', () => {
    const remoteConfig = { baseUrl: 'https://chomp.remote.example.com' };

    const result = selectChompApiConfig.resultFunc({
      chompApiConfig: remoteConfig,
    });

    expect(result).toEqual(remoteConfig);
  });

  it('returns default config when remote config is absent', () => {
    const result = selectChompApiConfig.resultFunc({
      chompApiConfig: null,
    });

    expect(result).toEqual(
      expect.objectContaining({ baseUrl: expect.any(String) }),
    );
  });

  it('prefers remote config over default', () => {
    const remoteConfig = { baseUrl: 'https://chomp.remote.example.com' };

    const result = selectChompApiConfig.resultFunc({
      chompApiConfig: remoteConfig,
    });

    expect(result).toEqual(remoteConfig);
  });

  it('falls back when remote config has no baseUrl', () => {
    const result = selectChompApiConfig.resultFunc({
      chompApiConfig: {},
    });

    expect(result).toEqual(
      expect.objectContaining({ baseUrl: expect.any(String) }),
    );
  });
});

describe('selectChompApiBaseUrl', () => {
  it('extracts baseUrl from config', () => {
    const result = selectChompApiBaseUrl.resultFunc({
      baseUrl: 'https://chomp.remote.example.com',
    });

    expect(result).toBe('https://chomp.remote.example.com');
  });
});
