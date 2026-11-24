import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { strings } from '../../../../../../../locales/i18n';
import { KALSHI_VENUE_ID } from '../../../adapters/remote/KalshiRemoteAdapter';
import type {
  PredictAmount,
  PredictTimestamp,
  PredictWithdrawReceipt,
} from '../../../types';
import { PredictWithdrawFlowTestIds } from './PredictWithdrawFlow.testIds';
import { WithdrawStatusStep } from './WithdrawStatusStep';

const settledReceipt = (
  overrides: Partial<PredictWithdrawReceipt> = {},
): PredictWithdrawReceipt => ({
  operationId: 'd4e5f6a7-1111-4222-8333-444455556666',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: KALSHI_VENUE_ID,
  currency: 'USD',
  mode: 'sweep_all',
  status: 'settled',
  needsManualReview: false,
  withdrawnAmount: '5.00' as PredictAmount,
  venueTransferId: 'transfer-1',
  destination: {
    address: '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c',
    network: 'base',
    source: 'configured_demo',
  },
  createdAt: '2026-03-01T12:00:10.000Z' as PredictTimestamp,
  resolvedAt: '2026-03-01T12:00:20.000Z' as PredictTimestamp,
  ...overrides,
});

describe('WithdrawStatusStep', () => {
  it('reports what a settled sweep withdrew and what stayed behind', () => {
    render(
      <WithdrawStatusStep receipt={settledReceipt()} isPrivacyMode={false} />,
    );

    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.STATUS_AMOUNT),
    ).toHaveTextContent('$5.00');
    expect(
      screen.getByText(strings('predict_next.withdraw.status.sweep_remainder')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('predict_next.withdraw.status.settled.title')),
    ).toHaveProp('accessibilityRole', 'header');
  });

  it('does not describe a remainder for a fixed withdrawal', () => {
    render(
      <WithdrawStatusStep
        receipt={settledReceipt({
          mode: 'fixed',
          requestedAmount: '5.00' as PredictAmount,
        })}
        isPrivacyMode={false}
      />,
    );

    expect(
      screen.queryByText(
        strings('predict_next.withdraw.status.sweep_remainder'),
      ),
    ).not.toBeOnTheScreen();
  });
});
