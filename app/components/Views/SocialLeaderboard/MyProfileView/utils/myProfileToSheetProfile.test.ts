import type { MySocialProfile } from '../hooks/useMyProfile';
import { myProfileToSheetProfile } from './myProfileToSheetProfile';

describe('myProfileToSheetProfile', () => {
  const baseProfile: MySocialProfile = {
    profileId: 'current-user',
    displayName: 'Giga Whale',
    handle: 'giga-whale',
    shareUrl: 'https://metamask.io/social/giga-whale',
    winRatePercent: 60,
    pnlUsd: 7100,
    holdTimeLabel: '4d',
    timesCopied: 981,
    followerCount: 4,
  };

  it('maps mock owner profile fields into trader stats sheet shape', () => {
    const sheetProfile = myProfileToSheetProfile(baseProfile);

    expect(sheetProfile.stats.pnl30d).toBe(7100);
    expect(sheetProfile.stats.winRate30d).toBe(0.6);
    expect(sheetProfile.stats.medianHoldMinutes).toBe(5760);
    expect(sheetProfile.copytradedAllTime.count).toBe(981);
    expect(sheetProfile.followerCount).toBe(4);
  });

  it('maps missing timesCopied to a zero copytradedAllTime count', () => {
    const sheetProfile = myProfileToSheetProfile({
      ...baseProfile,
      timesCopied: undefined,
    });

    expect(sheetProfile.copytradedAllTime.count).toBe(0);
  });
});
