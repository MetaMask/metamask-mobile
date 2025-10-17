import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { PredictClaimAmount } from './predict-claim-amount';
import { PredictPositionStatus } from '../../../../../UI/Predict';

function render() {
  return renderWithProvider(<PredictClaimAmount />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: [
                {
                  id: 'position-1',
                  providerId: 'polymarket',
                  marketId: 'market-1',
                  outcomeId: 'outcome-1',
                  outcomeTokenId: 'token-1',
                  outcome: 'Yes',
                  title: 'Test Position 1',
                  icon: 'icon.png',
                  amount: 100,
                  price: 1.0,
                  status: PredictPositionStatus.WON,
                  size: 100,
                  outcomeIndex: 0,
                  realizedPnl: 0,
                  curPrice: 1.5,
                  conditionId: 'condition-1',
                  percentPnl: 20.23,
                  cashPnl: 46.35,
                  initialValue: 182.74,
                  avgPrice: 1.0,
                  currentValue: 229.09,
                  endDate: '2025-01-01',
                  claimable: true,
                  redeemable: true,
                  negRisk: false,
                },
              ],
            },
          },
        },
      },
    ),
  });
}

describe('PredictClaimAmount', () => {
  it('renders formatted winnings', () => {
    // Given a won position with currentValue of 229.09
    const { getByText } = render();

    // Then the formatted winnings amount is displayed
    expect(getByText('$229.09')).toBeDefined();
  });

  it('renders formatted change and percentage', () => {
    // Given a won position with cashPnl of 46.35 and currentValue of 229.09
    const { getByText } = render();

    // Then the formatted change and percentage is displayed
    expect(getByText('+$46.35 (+20.23%)')).toBeDefined();
  });
});
