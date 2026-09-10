import AppConstants from '../../../../AppConstants';
import { getRewardsMoneyApiBaseUrl } from './rewards-money-api-url';

describe('getRewardsMoneyApiBaseUrl', () => {
  it('prefers an explicit override so the app can point at a local backend', () => {
    const result = getRewardsMoneyApiBaseUrl(
      'production',
      'http://192.168.1.10:3000',
    );

    expect(result).toBe('http://192.168.1.10:3000');
  });

  it('returns the PRD host for a production build', () => {
    const result = getRewardsMoneyApiBaseUrl('production', undefined);

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.PRD);
  });

  it('returns the PRD host for a release-candidate build', () => {
    const result = getRewardsMoneyApiBaseUrl('rc', undefined);

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.PRD);
  });

  it('returns the DEV host for a dev build', () => {
    const result = getRewardsMoneyApiBaseUrl('dev', undefined);

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.DEV);
  });

  it('falls back to DEV for a UAT build, which has no namespace deployed', () => {
    const result = getRewardsMoneyApiBaseUrl('exp', undefined);

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.DEV);
  });

  it('falls back to DEV when the environment is unset', () => {
    const result = getRewardsMoneyApiBaseUrl(undefined, undefined);

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.DEV);
  });

  it('ignores an empty override rather than resolving to an empty base URL', () => {
    const result = getRewardsMoneyApiBaseUrl('production', '');

    expect(result).toBe(AppConstants.REWARDS_MONEY_API_URL.PRD);
  });
});
