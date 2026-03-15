import React from 'react';
import { render } from '@testing-library/react-native';
import PredictPayWithAnyTokenInfo from './PredictPayWithAnyTokenInfo';

let mockIsPredictBalanceSelected = false;
let mockUpdatePendingAmount = jest.fn();
let mockAmountHuman = '';
let mockUpdateTokenAmountCallback = jest.fn();
let mockActiveTransactionMeta: { id?: string } | null = null;

jest.mock('../../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

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
    it('calls updateTokenAmountCallback when amountHuman is valid', () => {
      mockIsPredictBalanceSelected = false;
      mockActiveTransactionMeta = { id: 'tx-1' };
      mockAmountHuman = '100.50';

      render(<PredictPayWithAnyTokenInfo depositAmount={100} />);

      expect(mockUpdateTokenAmountCallback).toHaveBeenCalledWith('100.50');
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
});
