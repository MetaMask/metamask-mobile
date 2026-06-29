import { FeatureId } from '@metamask/bridge-controller';

import { getQuickBuyFeatureId } from './getQuickBuyFeatureId';

describe('getQuickBuyFeatureId', () => {
  it('maps token-details surfaces to QUICK_BUY_TOKEN_DETAILS', () => {
    expect(getQuickBuyFeatureId('asset_details')).toBe(
      FeatureId.QUICK_BUY_TOKEN_DETAILS,
    );
    expect(getQuickBuyFeatureId('market_insights')).toBe(
      FeatureId.QUICK_BUY_TOKEN_DETAILS,
    );
    expect(getQuickBuyFeatureId('security_trust')).toBe(
      FeatureId.QUICK_BUY_TOKEN_DETAILS,
    );
  });

  it('maps follow-trading surfaces to QUICK_BUY_FOLLOW_TRADING', () => {
    expect(getQuickBuyFeatureId('leaderboard')).toBe(
      FeatureId.QUICK_BUY_FOLLOW_TRADING,
    );
    expect(getQuickBuyFeatureId('profile_position')).toBe(
      FeatureId.QUICK_BUY_FOLLOW_TRADING,
    );
    expect(getQuickBuyFeatureId('notification')).toBe(
      FeatureId.QUICK_BUY_FOLLOW_TRADING,
    );
  });

  it('maps explore surfaces to QUICK_BUY_EXPLORE', () => {
    expect(getQuickBuyFeatureId('explore_search')).toBe(
      FeatureId.QUICK_BUY_EXPLORE,
    );
    expect(getQuickBuyFeatureId('explore_crypto')).toBe(
      FeatureId.QUICK_BUY_EXPLORE,
    );
    expect(getQuickBuyFeatureId('explore_now')).toBe(
      FeatureId.QUICK_BUY_EXPLORE,
    );
    expect(getQuickBuyFeatureId('explore_rwas')).toBe(
      FeatureId.QUICK_BUY_EXPLORE,
    );
    expect(getQuickBuyFeatureId('explore_stocks')).toBe(
      FeatureId.QUICK_BUY_EXPLORE,
    );
  });

  it('defaults to UNKNOWN when source is missing', () => {
    expect(getQuickBuyFeatureId()).toBe(FeatureId.UNKNOWN);
  });
});
