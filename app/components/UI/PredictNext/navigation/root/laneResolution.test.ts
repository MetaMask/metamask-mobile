import {
  hasLegacyMarketListParams,
  resolvePinnedMarketListVenue,
  resolvePinnedVenue,
} from './laneResolution';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';

describe('temporary Predict lane resolution', () => {
  it.each([
    { feedId: 'sports' as const },
    { tabId: 'basketball' },
    { query: 'election' },
  ])('recognizes legacy market-list parameters', (params) => {
    const result = hasLegacyMarketListParams(params);

    expect(result).toBe(true);
  });

  it('keeps a parameterized market list on Polymarket', () => {
    const result = resolvePinnedMarketListVenue({ query: 'election' });

    expect(result).toBe('polymarket');
  });

  it('leaves a generic market list to the Active Venue', () => {
    const result = resolvePinnedMarketListVenue();

    expect(result).toBeUndefined();
  });

  it('does not change venue for transaction attribution metadata', () => {
    const result = resolvePinnedMarketListVenue({
      transactionActiveAbTests: [
        createActiveABTestAssignment(
          'homeTMCU1209AbtestHomepageBalanceBreakdownV2',
          'treatment',
        ),
      ],
    });

    expect(result).toBeUndefined();
  });

  it('keeps a specific child route on Polymarket', () => {
    const result = resolvePinnedVenue({ screen: 'PredictMarketDetails' });

    expect(result).toBe('polymarket');
  });

  it('keeps a parameterized root market list on Polymarket', () => {
    const result = resolvePinnedVenue({
      screen: 'PredictMarketList',
      params: { feedId: 'sports' },
    });

    expect(result).toBe('polymarket');
  });

  it.each([undefined, {}, { screen: 'PredictMarketList' as const }])(
    'leaves a generic root entry to the Active Venue',
    (route) => {
      const result = resolvePinnedVenue(route);

      expect(result).toBeUndefined();
    },
  );
});
