import type { PredictConfig } from '../../config/predictConfig';
import {
  hasLegacyMarketListParams,
  resolvePinnedVenue,
  resolvePredictMarketListLane,
} from './laneResolution';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';

const config = (polymarket: boolean, kalshi: boolean): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: polymarket },
    kalshi: { enabled: kalshi },
  },
  venueSelection: { enabled: false },
});

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
    const result = resolvePredictMarketListLane(config(false, true), {
      query: 'election',
    });

    expect(result).toBe('polymarket');
  });

  it('routes a generic market list to Kalshi', () => {
    const result = resolvePredictMarketListLane(config(false, true));

    expect(result).toBe('kalshi');
  });

  it('does not change venue for transaction attribution metadata', () => {
    const result = resolvePredictMarketListLane(config(false, true), {
      transactionActiveAbTests: [
        createActiveABTestAssignment(
          'homeTMCU1209AbtestHomepageBalanceBreakdownV2',
          'treatment',
        ),
      ],
    });

    expect(result).toBe('kalshi');
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
