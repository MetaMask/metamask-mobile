import React from 'react';
import { render } from '@testing-library/react-native';
import PredictPayWithAnyTokenInfo from './PredictPayWithAnyTokenInfo';

let mockIsPredictBalanceSelected = false;
let mockUpdatePendingAmount = jest.fn();
let mockAmountHuman = '';
let mockUpdateTokenAmountCallback = jest.fn();
let mockActiveTransactionMeta: { id?: string } | null = null;
let mockSelectedPaymentToken:
  | {
      address: string;
      chainId: string;
    }
  | undefined;
let mockPayToken:
  | {
      address: string;
      chainId: string;
    }
  | undefined;
let mockSetPayToken = jest.fn();

jest.mock('../../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedPaymentToken,
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
  });

  describe('render', () => {
    it('returns null', () => {
      const { UNSAFE_root } = render(
        <PredictPayWithAnyTokenInfo depositAmount={100} />,
      );

      expect(UNSAFE_root.children.length).toBe(0);
    });
  });

  describe('updatePendingAmount effect', () => {
    it('calls updatePendingAmount when depositAmount > 0, not isPredictBalanceSelected, and has transactionMeta', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100');
    });

    it('does not call updatePendingAmount when isPredictBalanceSelected is true', () => {
      mockIsPredictBalanceSelected = true;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('does not call updatePendingAmount when depositAmount <= 0', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(<PredictPayWithAnyTokenInfo depositAmount={0} />);

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('does not call updatePendingAmount when activeTransactionMeta is null', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = null;

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdatePendingAmount).not.toHaveBeenCalled();
    });

    it('formats depositAmount with 2 decimal places using BigNumber', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(<PredictPayWithAnyTokenInfo depositAmount={100.456} />);

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100.46');
    });

    it('rounds depositAmount correctly using ROUND_HALF_UP', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };

      render(<PredictPayWithAnyTokenInfo depositAmount={100.445} />);

      expect(mockUpdatePendingAmount).toHaveBeenCalledWith('100.45');
    });
  });

  describe('updateTokenAmountCallback effect', () => {
    it('calls updateTokenAmountCallback with the parsed deposit amount when amountHuman is valid', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).toHaveBeenCalledWith('100');
    });

    it('uses the rounded parsed deposit amount instead of the fiat-converted amountHuman', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '2.078803';

      render(<PredictPayWithAnyTokenInfo depositAmount={2.08} />);

      expect(mockUpdateTokenAmountCallback).toHaveBeenCalledWith('2.08');
    });

    it('does not call updateTokenAmountCallback when amountHuman is "0"', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '0';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when amountHuman is empty', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when parsedDepositAmount is empty', () => {
      mockIsPredictBalanceSelected = true;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when activeTransactionMeta is null', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = null;
      mockAmountHuman = '100.50';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).not.toHaveBeenCalled();
    });

    it('does not call updateTokenAmountCallback when depositAmount <= 0', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(<PredictPayWithAnyTokenInfo depositAmount={0} />);

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

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

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

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when isPredictBalanceSelected is true', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockIsPredictBalanceSelected = true;
      mockSelectedPaymentToken = {
        address: '0xabc123',
        chainId: '0x1',
      };

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when selectedPaymentToken is undefined', () => {
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockSelectedPaymentToken = undefined;

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });

    it('does not call setPayToken when transactionMeta is missing', () => {
      mockActiveTransactionMeta = null;
      mockSelectedPaymentToken = {
        address: '0xabc123',
        chainId: '0x1',
      };

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockSetPayToken).not.toHaveBeenCalled();
    });
  });
});
