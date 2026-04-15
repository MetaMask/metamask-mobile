import React from 'react';
import { render } from '@testing-library/react-native';
import PredictPayWithAnyTokenInfo from './PredictPayWithAnyTokenInfo';
import { OrderPreview, Side } from '../../../../types';

let mockIsPredictBalanceSelected = false;
let mockUpdatePendingAmount = jest.fn();
let mockAmountHuman = '';
let mockUpdateTokenAmountCallback = jest.fn();
let mockActiveTransactionMeta: { id?: string } | null = null;
let mockSelectedPaymentToken:
  | {
      address?: string;
      chainId?: string;
    }
  | undefined;
let mockPayToken:
  | {
      address: string;
      chainId: string;
    }
  | undefined;
let mockSetPayToken = jest.fn();
let mockPredictBalance = 0;

jest.mock('../../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedPaymentToken,
  }),
}));

jest.mock('../../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockPredictBalance,
  }),
}));

jest.mock(
  '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({
      setPayToken: mockSetPayToken,
      payToken: mockPayToken,
    }),
  }),
);

jest.mock(
  '../../../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe',
  () => jest.fn(),
);

jest.mock(
  '../../../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount',
  () => ({
    useUpdateTokenAmount: () => ({
      updateTokenAmount: mockUpdateTokenAmountCallback,
    }),
  }),
);

jest.mock(
  '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockActiveTransactionMeta,
  }),
);

jest.mock(
  '../../../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount',
  () => ({
    useTransactionCustomAmount: () => ({
      updatePendingAmount: mockUpdatePendingAmount,
      amountHuman: mockAmountHuman,
    }),
  }),
);

jest.mock('../../../../../../Views/confirmations/constants/predict', () => ({
  PREDICT_CURRENCY: 'USD',
}));

jest.mock('../../../../constants/transactions', () => ({
  MINIMUM_BET: 1,
}));

const createMockPreview = (
  overrides?: Partial<OrderPreview>,
): OrderPreview => ({
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1000000,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 180,
  slippage: 0.01,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  rateLimited: false,
  fees: {
    totalFee: 0,
    metamaskFee: 0,
    providerFee: 0,
    totalFeePercentage: 0,
    collector: '0xCollector',
  },
  ...overrides,
});

const defaultPreview = createMockPreview();

describe('PredictPayWithAnyTokenInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = false;
    mockUpdatePendingAmount = jest.fn();
    mockAmountHuman = '';
    mockUpdateTokenAmountCallback = jest.fn();
    mockActiveTransactionMeta = null;
    mockSelectedPaymentToken = undefined;
    mockPayToken = undefined;
    mockSetPayToken = jest.fn();
    mockPredictBalance = 0;
  });

  describe('render', () => {
    it('returns null when transactionMeta is missing', () => {
      const { UNSAFE_root } = render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(UNSAFE_root.children.length).toBe(0);
    });
  });

  describe('depositAmount computation', () => {
    it('produces empty when preview is null', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={1}
          preview={null}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('produces empty when preview has no fees', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={1}
          preview={createMockPreview({ fees: undefined })}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('produces empty when currentValue is below minimum bet', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={0.5}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('computes the remaining amount needed after predict balance is applied', () => {
      mockPredictBalance = 80;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={createMockPreview({
            fees: {
              totalFee: 5,
              metamaskFee: 2,
              providerFee: 3,
              totalFeePercentage: 0.05,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      // totalPay = 100 + 3 + 2 = 105, remaining = 105 - 80 = 25
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('25');
    });

    it('rounds the remaining amount up to 2 decimals when a deposit is still needed', () => {
      mockPredictBalance = 0;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={2}
          preview={createMockPreview({
            fees: {
              totalFee: 0.075,
              metamaskFee: 0.035,
              providerFee: 0.04,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      // totalPay = 2 + 0.04 + 0.035 = 2.075, remaining = 2.075, ROUND_UP → 2.08
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('2.08');
    });

    it('rounds up even when the third decimal is below 5 so the deposit fully covers the shortfall', () => {
      mockPredictBalance = 0;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={2}
          preview={createMockPreview({
            fees: {
              totalFee: 0.074,
              metamaskFee: 0.034,
              providerFee: 0.04,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      // totalPay = 2 + 0.04 + 0.034 = 2.074, remaining = 2.074, ROUND_UP → 2.08
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('2.08');
    });

    it('rounds a tiny positive shortfall up to the minimum cent instead of zero', () => {
      mockPredictBalance = 2.075889;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={2}
          preview={createMockPreview({
            fees: {
              totalFee: 0.08,
              metamaskFee: 0.04,
              providerFee: 0.04,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      // totalPay = 2.08, remaining = 2.08 - 2.075889 ≈ 0.004111, ROUND_UP → 0.01
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('0.01');
    });

    it('computes the full preview total when predict balance already covers the bet', () => {
      mockPredictBalance = 110;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={1}
          preview={createMockPreview({
            maxAmountSpent: 1,
            fees: {
              totalFee: 0.04,
              metamaskFee: 0.02,
              providerFee: 0.02,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      // totalPay = 1 + 0.02 + 0.02 = 1.04, remaining = 1.04 - 110 < 0, returns totalPay ROUND_UP = 1.04
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('1.04');
    });
  });

  describe('deposit amount gating', () => {
    it('does not commit deposit amount while input is focused', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('commits deposit amount when input loses focus', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      const { rerender } = render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();

      rerender(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100');
    });

    it('does not re-trigger deposit update when value is unchanged after unfocus', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      const { rerender } = render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledTimes(1);
      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100');

      mockUpdatePendingAmount.mockClear();

      rerender(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused
        />,
      );

      rerender(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('updates deposit amount when value changes after unfocus', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };

      const { rerender } = render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100');
      mockUpdatePendingAmount.mockClear();

      rerender(
        <PredictPayWithAnyTokenInfo
          currentValue={200}
          preview={defaultPreview}
          isInputFocused
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();

      rerender(
        <PredictPayWithAnyTokenInfo
          currentValue={200}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('200');
    });
  });

  describe('updatePendingAmount effect', () => {
    it('calls updatePendingAmount when depositAmount is valid and has transactionMeta', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100');
    });

    it('does not call updatePendingAmount when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('does not call updatePendingAmount when depositAmount is empty', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={0}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('does not call updatePendingAmount when activeTransactionMeta is null', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = null;

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('formats computed depositAmount to a string with 2 decimal places', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={2}
          preview={createMockPreview({
            fees: {
              totalFee: 0.075,
              metamaskFee: 0.035,
              providerFee: 0.04,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('2.08');
    });
  });

  describe('updateTokenAmountCallback effect', () => {
    it('calls updateTokenAmountCallback with amountHuman when deposit is valid', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).toHaveBeenCalledWith('100.50');
    });

    it('passes amountHuman from useTransactionCustomAmount, not the raw depositAmount', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '2.078803';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={2}
          preview={createMockPreview({
            fees: {
              totalFee: 0.075,
              metamaskFee: 0.035,
              providerFee: 0.04,
              totalFeePercentage: 4,
              collector: '0xCollector',
            },
          })}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).toHaveBeenCalledWith('2.078803');
    });

    it('does not call updateTokenAmountCallback when amountHuman is "0"', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '0';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when amountHuman is empty', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when depositAmount is empty', () => {
      mockIsPredictBalanceSelected = true;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when activeTransactionMeta is null', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = null;
      mockAmountHuman = '100.50';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when depositAmount is 0', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={0}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });
  });

  describe('setPayToken effect', () => {
    it('calls setPayToken when selected token is not applied', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = {
        address: '0xabc123',
        chainId: '0x1',
      };
      mockPayToken = {
        address: '0xdef456',
        chainId: '0x1',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).toHaveBeenCalledWith({
        address: '0xabc123',
        chainId: '0x1',
      });
    });

    it('does not call setPayToken when selected token is already applied (case-insensitive)', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = {
        address: '0xAbC123',
        chainId: '0x1',
      };
      mockPayToken = {
        address: '0xabc123',
        chainId: '0X1',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when isPredictBalanceSelected is true', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockIsPredictBalanceSelected = true;
      mockSelectedPaymentToken = {
        address: '0xabc123',
        chainId: '0x1',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when selectedPaymentToken is undefined', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = undefined;

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when selectedPaymentToken address is missing', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = {
        chainId: '0x1',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when selectedPaymentToken chainId is missing', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = {
        address: '0xabc123',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when transactionMeta is missing', () => {
      mockActiveTransactionMeta = null;
      mockSelectedPaymentToken = {
        address: '0xabc123',
        chainId: '0x1',
      };

      render(
        <PredictPayWithAnyTokenInfo
          currentValue={100}
          preview={defaultPreview}
          isInputFocused={false}
        />,
      );

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });
  });
});
