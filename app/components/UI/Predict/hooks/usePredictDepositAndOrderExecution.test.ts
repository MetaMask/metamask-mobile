import { StackActions } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { usePredictDepositAndOrderExecution } from './usePredictDepositAndOrderExecution';
import { PredictBuyPreviewParams } from '../types/navigation';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockPlaceOrder = jest.fn();
const mockOnApprovalConfirm = jest.fn();
const mockShowToast = jest.fn();

let mockIsPredictBalanceSelected = false;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    dispatch: mockDispatch,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    placeOrder: mockPlaceOrder,
  }),
}));

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: () => ({
    onConfirm: mockOnApprovalConfirm,
  }),
}));

jest.mock('./usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const market = {
  id: 'market-1',
  title: 'Market title',
} as PredictBuyPreviewParams['market'];

const outcome = {
  id: 'outcome-1',
} as PredictBuyPreviewParams['outcome'];

const outcomeToken = {
  id: 'token-1',
} as PredictBuyPreviewParams['outcomeToken'];

const preview = {
  marketId: market.id,
  outcomeId: outcome.id,
  outcomeTokenId: outcomeToken.id,
  timestamp: Date.now(),
  side: 'BUY',
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 20,
  slippage: 0.005,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  fees: {
    metamaskFee: 0,
    providerFee: 0,
    totalFee: 0,
    totalFeePercentage: 0,
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    {
      value: {
        toastRef: {
          current: {
            showToast: mockShowToast,
          },
        },
      },
    },
    children,
  );

describe('usePredictDepositAndOrderExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = false;
    mockPlaceOrder.mockResolvedValue(undefined);
    mockOnApprovalConfirm.mockResolvedValue(undefined);
  });

  it('redirects to buy preview with amount right after approval when non-predict balance is selected', async () => {
    const { result } = renderHook(
      () =>
        usePredictDepositAndOrderExecution({
          market,
          outcome,
          outcomeToken,
          orderAmountUsd: 25,
          depositTransactionId: 'deposit-tx-id',
          preview,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mockOnApprovalConfirm).toHaveBeenCalledWith({
      deleteAfterResult: true,
      waitForResult: true,
      handleErrors: false,
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.PREDICT.MODALS.BUY_PREVIEW, {
        market,
        outcome,
        outcomeToken,
        amount: 25,
        transactionId: 'deposit-tx-id',
        animationEnabled: false,
      }),
    );
    expect(mockPlaceOrder).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('places order directly on info screen when predict balance is selected', async () => {
    mockIsPredictBalanceSelected = true;

    const { result } = renderHook(
      () =>
        usePredictDepositAndOrderExecution({
          market,
          outcome,
          outcomeToken,
          orderAmountUsd: 25,
          depositTransactionId: 'deposit-tx-id',
          preview,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mockPlaceOrder).toHaveBeenCalledWith({
      preview,
      analyticsProperties: {
        marketId: market.id,
        outcome: outcome.id,
      },
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
