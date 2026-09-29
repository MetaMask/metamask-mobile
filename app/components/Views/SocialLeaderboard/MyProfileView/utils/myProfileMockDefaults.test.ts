import type { MySocialProfile } from '../hooks/useMyProfile';
import {
  applyMyProfileMockDefaults,
  MY_PROFILE_SHEET_MOCK_DEFAULTS,
} from './myProfileMockDefaults';

describe('applyMyProfileMockDefaults', () => {
  const legacyProfile: MySocialProfile = {
    profileId: 'current-user',
    displayName: 'Giga Whale',
    handle: 'giga-whale',
    shareUrl: 'https://metamask.io/social/giga-whale',
    winRatePercent: 60,
    pnlUsd: 7100,
    timesCopied: 981,
  };

  it('fills sheet mock stats missing from legacy in-memory profiles', () => {
    const result = applyMyProfileMockDefaults(legacyProfile);

    expect(result.volumeUsd30d).toBe(
      MY_PROFILE_SHEET_MOCK_DEFAULTS.volumeUsd30d,
    );
    expect(result.tradeCount30d).toBe(
      MY_PROFILE_SHEET_MOCK_DEFAULTS.tradeCount30d,
    );
    expect(result.profileAgeLabel).toBe(
      MY_PROFILE_SHEET_MOCK_DEFAULTS.profileAgeLabel,
    );
    expect(result.copySuccessRatePercent).toBe(
      MY_PROFILE_SHEET_MOCK_DEFAULTS.copySuccessRatePercent,
    );
  });

  it('keeps explicit values on the profile', () => {
    const result = applyMyProfileMockDefaults({
      ...legacyProfile,
      volumeUsd30d: 1000,
      profileAgeLabel: '6mo',
    });

    expect(result.volumeUsd30d).toBe(1000);
    expect(result.profileAgeLabel).toBe('6mo');
  });
});
