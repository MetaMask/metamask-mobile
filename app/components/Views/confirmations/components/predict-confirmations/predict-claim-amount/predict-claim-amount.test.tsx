import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import {
  accountMock,
  otherControllersMock,
} from '../../../__mocks__/controllers/other-controllers-mock';
import {
  PredictPositionStatus,
  type PredictPosition,
} from '../../../../../UI/Predict/types';
import { PredictClaimConfirmationSelectorsIDs } from '../../../../../UI/Predict/Predict.testIds';
import { PredictClaimAmount } from './predict-claim-amount';

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  id: 'position-1',
  providerId: 'polymarket',
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'Yes',
  outcomeTokenId: 'token-1',
  outcomeIndex: 0,
  title: 'Market 1',
  icon: 'https://example.com/icon.png',
  amount: 10,
  price: 1,
  size: 10,
  status: PredictPositionStatus.WON,
  percentPnl: 50,
  cashPnl: 25,
  currentValue: 75,
  initialValue: 50,
  avgPrice: 0.5,
  claimable: true,
  endDate: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function render(claimablePositions?: PredictPosition[]) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  // Assigned rather than merged: lodash `merge` combines arrays index-wise,
  // which would leave the fixture's extra positions in place.
  if (claimablePositions) {
    state.engine.backgroundState.PredictController.claimablePositions = {
      [accountMock]: claimablePositions,
    };
  }

  return renderWithProvider(<PredictClaimAmount />, { state });
}

describe('PredictClaimAmount', () => {
  it('renders formatted winnings', () => {
    // Given a won position with currentValue of 229.09
    const { getByText } = render();

    // Then the formatted winnings amount is displayed
    expect(getByText('$2,250')).toBeDefined();
  });

  it('renders formatted change and percentage', () => {
    // Given a won position with cashPnl of 46.35 and currentValue of 229.09
    const { getByText } = render();

    // Then the formatted change and percentage is displayed
    expect(getByText('+$750 (33.33%)')).toBeDefined();
  });

  it('renders a negative change for a push bought above 50c', () => {
    // Given a 50/50 push that paid back less than it cost
    const { getByText } = render([
      createPosition({
        status: PredictPositionStatus.REDEEMABLE,
        currentValue: 53.91,
        initialValue: 69.92,
        cashPnl: -16.01,
      }),
    ]);

    // Then the payout is shown and the change is signed as a loss
    expect(getByText('$53.91')).toBeDefined();
    expect(getByText('-$16.01 (-29.7%)')).toBeDefined();
  });

  it('keeps the payout and omits the change when net P&L is zero', () => {
    // Given a 50/50 push bought at exactly 50c
    const { getByText, queryByText } = render([
      createPosition({
        status: PredictPositionStatus.REDEEMABLE,
        currentValue: 50,
        initialValue: 50,
        cashPnl: 0,
      }),
    ]);

    // Then the payout is still shown and there is no change line
    expect(getByText('$50')).toBeDefined();
    expect(queryByText(/%\)$/)).toBeNull();
  });

  it('signs the net change across mixed won and pushed positions', () => {
    // Given a win and a push whose combined P&L is negative
    const { getByText } = render([
      createPosition({ id: 'win', currentValue: 75, cashPnl: 25 }),
      createPosition({
        id: 'push',
        status: PredictPositionStatus.REDEEMABLE,
        currentValue: 40,
        initialValue: 70,
        cashPnl: -30,
      }),
    ]);

    // Then the payout is summed and the net change is signed as a loss
    expect(getByText('$115')).toBeDefined();
    expect(getByText('-$5 (-4.35%)')).toBeDefined();
  });

  it('renders nothing when there is nothing to claim', () => {
    // Given no claimable positions
    const { queryByTestId } = render([]);

    // Then the summary is not rendered
    expect(
      queryByTestId(
        PredictClaimConfirmationSelectorsIDs.CLAIM_AMOUNT_CONTAINER,
      ),
    ).toBeNull();
  });
});
