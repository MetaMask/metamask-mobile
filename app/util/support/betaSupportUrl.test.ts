const BETA_SUPPORT_URL = 'https://intercom.help/internal-beta-testing/en/';

const loadGetBetaSupportUrl = (isBetaBuild: boolean) => {
  let getBetaSupportUrl: () => string = () => '';
  jest.isolateModules(() => {
    jest.doMock('../environment', () => ({ isBetaBuild }));
    ({ getBetaSupportUrl } = jest.requireActual('./betaSupportUrl'));
  });
  return getBetaSupportUrl;
};

describe('getBetaSupportUrl', () => {
  afterEach(() => {
    jest.dontMock('../environment');
  });

  it('returns the beta Intercom URL on beta builds', () => {
    const getBetaSupportUrl = loadGetBetaSupportUrl(true);

    const result = getBetaSupportUrl();

    expect(result).toBe(BETA_SUPPORT_URL);
  });

  it('returns an empty string on non-beta builds', () => {
    const getBetaSupportUrl = loadGetBetaSupportUrl(false);

    const result = getBetaSupportUrl();

    expect(result).toBe('');
  });
});
