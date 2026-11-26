import React from 'react';
import { render, screen } from '@testing-library/react-native';

import type {
  PredictAmount,
  PredictBuyOrderPreview,
  PredictDecimal,
  PredictEntityId,
  PredictSignedAmount,
  PredictTimestamp,
  PredictVenueId,
} from '../../../types';
import { formatOdds, OrderDetailsRows } from './OrderDetailsRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const price = (value: string) => value as PredictDecimal;

const makeBuyPreview = (
  overrides: Partial<PredictBuyOrderPreview> = {},
): PredictBuyOrderPreview => ({
  previewId: 'preview-1',
  venueId: 'kalshi' as PredictVenueId,
  marketId: 'KXTEST-26-A' as PredictEntityId,
  side: 'yes',
  action: 'buy',
  requestedAmount: '20.00' as PredictAmount,
  orderAmount: '19.07' as PredictAmount,
  estimatedContracts: 41,
  averagePrice: price('0.4651'),
  limitPrice: price('0.4651'),
  fee: '0.82' as PredictAmount,
  feeBreakdown: [
    { source: 'venue', amount: '0.41' as PredictAmount },
    { source: 'metamask', amount: '0.41' as PredictAmount },
  ],
  totalDebit: '19.89' as PredictAmount,
  potentialPayout: '41.00' as PredictAmount,
  potentialProfit: '21.11' as PredictSignedAmount,
  expiresAt: '2026-11-26T18:00:00.000Z' as PredictTimestamp,
  ...overrides,
});

describe('formatOdds', () => {
  it('formats whole-number odds without decimals', () => {
    expect(formatOdds(price('0.53'))).toBe('53%');
    expect(formatOdds(price('0.5'))).toBe('50%');
    expect(formatOdds(price('1'))).toBe('100%');
  });

  it('keeps one decimal place for fractional odds', () => {
    expect(formatOdds(price('0.4651'))).toBe('46.5%');
    expect(formatOdds(price('0.525'))).toBe('52.5%');
  });

  it('rounds fractional odds to one decimal place', () => {
    expect(formatOdds(price('0.5299'))).toBe('53%');
  });

  it('formats zero as 0%', () => {
    expect(formatOdds(price('0'))).toBe('0%');
  });

  it('returns undefined when price is absent or non-numeric', () => {
    expect(formatOdds(undefined)).toBeUndefined();
    expect(formatOdds('' as PredictDecimal)).toBeUndefined();
    expect(formatOdds('not-a-price' as PredictDecimal)).toBeUndefined();
  });
});

describe('OrderDetailsRows', () => {
  it('renders formatted odds from preview averagePrice', () => {
    const preview = makeBuyPreview({ averagePrice: price('0.4651') });

    render(<OrderDetailsRows preview={preview} />);

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.DETAILS_ODDS),
    ).toHaveTextContent('46.5%');
  });

  it('falls back to 0% on the odds row when averagePrice is non-numeric', () => {
    const preview = makeBuyPreview({
      averagePrice: 'not-a-price' as PredictDecimal,
    });

    render(<OrderDetailsRows preview={preview} />);

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.DETAILS_ODDS),
    ).toHaveTextContent('0%');
  });
});
