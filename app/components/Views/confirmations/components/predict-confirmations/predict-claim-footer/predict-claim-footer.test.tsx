import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PredictClaimFooter } from './predict-claim-footer';
import { merge, noop } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { strings } from '../../../../../../../locales/i18n';
import { fireEvent } from '@testing-library/react-native';
import { PredictPositionStatus } from '../../../../../UI/Predict';

const mockWonPositions = [
  {
    id: 'position-1',
    providerId: 'polymarket',
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    outcome: 'Yes',
    title: 'Market 1',
    icon: 'https://example.com/icon1.png',
    amount: 100,
    price: 1.0,
    status: PredictPositionStatus.WON,
    size: 100,
    outcomeIndex: 0,
    realizedPnl: 0,
    curPrice: 1.5,
    conditionId: 'condition-1',
    percentPnl: 50,
    cashPnl: 50,
    initialValue: 100,
    avgPrice: 1.0,
    currentValue: 150,
    endDate: '2025-01-01',
    claimable: true,
    redeemable: true,
    negRisk: false,
  },
  {
    id: 'position-2',
    providerId: 'polymarket',
    marketId: 'market-2',
    outcomeId: 'outcome-2',
    outcomeTokenId: 'token-2',
    outcome: 'No',
    title: 'Market 2',
    icon: 'https://example.com/icon2.png',
    amount: 200,
    price: 1.2,
    status: PredictPositionStatus.WON,
    size: 200,
    outcomeIndex: 1,
    realizedPnl: 0,
    curPrice: 1.8,
    conditionId: 'condition-2',
    percentPnl: 50,
    cashPnl: 100,
    initialValue: 200,
    avgPrice: 1.2,
    currentValue: 300,
    endDate: '2025-01-02',
    claimable: true,
    redeemable: true,
    negRisk: false,
  },
  {
    id: 'position-3',
    providerId: 'polymarket',
    marketId: 'market-3',
    outcomeId: 'outcome-3',
    outcomeTokenId: 'token-3',
    outcome: 'Yes',
    title: 'Market 3',
    icon: 'https://example.com/icon3.png',
    amount: 300,
    price: 0.8,
    status: PredictPositionStatus.WON,
    size: 300,
    outcomeIndex: 0,
    realizedPnl: 0,
    curPrice: 1.2,
    conditionId: 'condition-3',
    percentPnl: 50,
    cashPnl: 150,
    initialValue: 300,
    avgPrice: 0.8,
    currentValue: 450,
    endDate: '2025-01-03',
    claimable: true,
    redeemable: true,
    negRisk: false,
  },
  {
    id: 'position-4',
    providerId: 'polymarket',
    marketId: 'market-4',
    outcomeId: 'outcome-4',
    outcomeTokenId: 'token-4',
    outcome: 'No',
    title: 'Market 4',
    icon: 'https://example.com/icon4.png',
    amount: 400,
    price: 0.9,
    status: PredictPositionStatus.WON,
    size: 400,
    outcomeIndex: 1,
    realizedPnl: 0,
    curPrice: 1.4,
    conditionId: 'condition-4',
    percentPnl: 55,
    cashPnl: 200,
    initialValue: 400,
    avgPrice: 0.9,
    currentValue: 600,
    endDate: '2025-01-04',
    claimable: true,
    redeemable: true,
    negRisk: false,
  },
  {
    id: 'position-5',
    providerId: 'polymarket',
    marketId: 'market-5',
    outcomeId: 'outcome-5',
    outcomeTokenId: 'token-5',
    outcome: 'Yes',
    title: 'Market 5',
    icon: 'https://example.com/icon5.png',
    amount: 500,
    price: 1.1,
    status: PredictPositionStatus.WON,
    size: 500,
    outcomeIndex: 0,
    realizedPnl: 0,
    curPrice: 1.6,
    conditionId: 'condition-5',
    percentPnl: 45,
    cashPnl: 250,
    initialValue: 500,
    avgPrice: 1.1,
    currentValue: 750,
    endDate: '2025-01-05',
    claimable: true,
    redeemable: true,
    negRisk: false,
  },
];

function render({ onPress }: { onPress?: () => void } = {}) {
  return renderWithProvider(<PredictClaimFooter onPress={onPress ?? noop} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: mockWonPositions,
            },
          },
        },
      },
    ),
  });
}

describe('PredictClaimFooter', () => {
  it('renders market count', () => {
    // Given 5 won positions
    const { getByText } = render();

    // Then the market count is displayed
    expect(
      getByText(strings('confirm.predict_claim.footer_top', { count: 5 })),
    ).toBeDefined();
  });

  it('renders market images', () => {
    // Given 5 won positions with icons
    const { getAllByTestId } = render();

    // Then the avatar group shows up to 3 avatars
    expect(getAllByTestId('token-avatar-image')).toHaveLength(3);
  });

  it('calls onPress when button is pressed', () => {
    // Given a button with an onPress handler
    const onPressMock = jest.fn();
    const { getByText } = render({ onPress: onPressMock });

    // When the button is pressed
    fireEvent.press(getByText(strings('confirm.predict_claim.button_label')));

    // Then the onPress handler is called
    expect(onPressMock).toHaveBeenCalled();
  });
});
