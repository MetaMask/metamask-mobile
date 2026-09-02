import AppConstants from '../../../../AppConstants';
import { getReferralProgramApiBaseUrl } from './referral-program-api-url';

describe('getReferralProgramApiBaseUrl', () => {
  it('prefers an explicit override so the app can point at a local backend', () => {
    const result = getReferralProgramApiBaseUrl(
      'production',
      'http://192.168.1.10:3000',
    );

    expect(result).toBe('http://192.168.1.10:3000');
  });

  it('returns the PRD host for a production build', () => {
    const result = getReferralProgramApiBaseUrl('production', undefined);

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.PRD);
  });

  it('returns the PRD host for a release-candidate build', () => {
    const result = getReferralProgramApiBaseUrl('rc', undefined);

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.PRD);
  });

  it('returns the DEV host for a dev build', () => {
    const result = getReferralProgramApiBaseUrl('dev', undefined);

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.DEV);
  });

  it('falls back to DEV for a UAT build, which has no namespace deployed', () => {
    const result = getReferralProgramApiBaseUrl('exp', undefined);

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.DEV);
  });

  it('falls back to DEV when the environment is unset', () => {
    const result = getReferralProgramApiBaseUrl(undefined, undefined);

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.DEV);
  });

  it('ignores an empty override rather than resolving to an empty base URL', () => {
    const result = getReferralProgramApiBaseUrl('production', '');

    expect(result).toBe(AppConstants.REFERRAL_PROGRAM_API_URL.PRD);
  });
});
