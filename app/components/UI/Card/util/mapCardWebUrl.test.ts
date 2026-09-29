import AppConstants from '../../../../core/AppConstants';
import { getCardWebBaseUrlForMetaMaskEnv } from './mapCardWebUrl';

describe('getCardWebBaseUrlForMetaMaskEnv', () => {
  it('returns AppConstants.CARD.WEB_URL.PRD for production/rc', () => {
    expect(getCardWebBaseUrlForMetaMaskEnv('production')).toBe(
      AppConstants.CARD.WEB_URL.PRD,
    );
    expect(getCardWebBaseUrlForMetaMaskEnv('rc')).toBe(
      AppConstants.CARD.WEB_URL.PRD,
    );
  });

  it('returns AppConstants.CARD.WEB_URL.UAT for pre-release/exp/beta', () => {
    expect(getCardWebBaseUrlForMetaMaskEnv('pre-release')).toBe(
      AppConstants.CARD.WEB_URL.UAT,
    );
    expect(getCardWebBaseUrlForMetaMaskEnv('exp')).toBe(
      AppConstants.CARD.WEB_URL.UAT,
    );
    expect(getCardWebBaseUrlForMetaMaskEnv('beta')).toBe(
      AppConstants.CARD.WEB_URL.UAT,
    );
  });

  it('returns AppConstants.CARD.WEB_URL.DEV for dev/e2e/local', () => {
    expect(getCardWebBaseUrlForMetaMaskEnv('dev')).toBe(
      AppConstants.CARD.WEB_URL.DEV,
    );
    expect(getCardWebBaseUrlForMetaMaskEnv('e2e')).toBe(
      AppConstants.CARD.WEB_URL.DEV,
    );
    expect(getCardWebBaseUrlForMetaMaskEnv('local')).toBe(
      AppConstants.CARD.WEB_URL.DEV,
    );
  });

  it('falls back to PRD for unknown or missing environments', () => {
    const testCases = [undefined, null, '', 'unknown'];
    testCases.forEach((testCase) => {
      expect(
        getCardWebBaseUrlForMetaMaskEnv(testCase as string | undefined),
      ).toBe(AppConstants.CARD.WEB_URL.PRD);
    });
  });
});
