import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import { useUnifiedTxActions } from './useUnifiedTxActions';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import Engine from '../../../core/Engine';
import {
  type TransactionMeta,
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type GasFeeEstimates,
} from '@metamask/transaction-controller';
import {
  LedgerReplacementTxTypes,
  createLedgerTransactionModalNavDetails,
} from '../../UI/LedgerModals/LedgerTransactionModal';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../util/conversions', () => ({
  decGWEIToHexWEI: jest.fn(),
}));

jest.mock('../../../util/number', () => ({
  addHexPrefix: jest.fn(),
}));

jest.mock('../../../util/transaction-controller', () => ({
  speedUpTransaction: jest.fn(),
}));

jest.mock('../../../util/transactions', () => ({
  validateTransactionActionBalance: jest.fn(),
}));

jest.mock('../../UI/LedgerModals/LedgerTransactionModal', () => {
  const actual = jest.requireActual(
    '../../UI/LedgerModals/LedgerTransactionModal',
  );
  return {
    ...actual,
    createLedgerTransactionModalNavDetails: jest.fn(),
  };
});

jest.mock('@metamask/rpc-errors', () => ({
  providerErrors: {
    userRejectedRequest: jest.fn(() => ({ code: 4001 })),
  },
}));

jest.mock('../../../core/Ledger/Ledger', () => ({
  getDeviceId: jest.fn(async () => 'device-id'),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TransactionController: {
      stopTransaction: jest.fn(),
    },
    ApprovalController: {
      accept: jest.fn(),
      reject: jest.fn(),
    },
    KeyringController: {
      resetQRKeyringState: jest.fn(),
    },
  },
}));

import { decGWEIToHexWEI } from '../../../util/conversions';
import { addHexPrefix } from '../../../util/number';
import { speedUpTransaction as speedUpTx } from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';

describe('useUnifiedTxActions', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  interface EngineContextMock {
    TransactionController: { stopTransaction: jest.Mock };
    ApprovalController: { accept: jest.Mock; reject: jest.Mock };
    KeyringController: { resetQRKeyringState: jest.Mock };
  }

  const engineContext = Engine.context as unknown as EngineContextMock;
  let defaultSelectorImpl: (selector: unknown) => unknown;

  beforeEach(() => {
    jest.resetAllMocks();

    defaultSelectorImpl = (selector: unknown) => {
      if (selector === (selectGasFeeEstimates as unknown)) {
        const estimates = {
          type: GasFeeEstimateType.FeeMarket,
          [GasFeeEstimateLevel.Medium]: { suggestedMaxFeePerGas: '25' },
        } as const;
        return estimates as unknown as GasFeeEstimates;
      }
      if (selector === (selectAccounts as unknown)) {
        const accountsMock = {
          '0xabc': { balance: '0xde0b6b3a7640000' },
        };
        return accountsMock as unknown as ReturnType<typeof selectAccounts>;
      }
      return undefined;
    };

    mockUseSelector.mockImplementation(defaultSelectorImpl);

    (decGWEIToHexWEI as jest.Mock).mockReturnValue('abc');
    (addHexPrefix as jest.Mock).mockImplementation((v: string) => `0x${v}`);
  });

  it('returns initial state and actions', () => {
    const { result } = renderHook(() => useUnifiedTxActions());

    expect(result.current.retryIsOpen).toBe(false);
    expect(result.current.retryErrorMsg).toBeUndefined();
    expect(result.current.speedUpIsOpen).toBe(false);
    expect(result.current.cancelIsOpen).toBe(false);
    expect(result.current.speedUp1559IsOpen).toBe(false);
    expect(result.current.cancel1559IsOpen).toBe(false);
    expect(result.current.speedUpConfirmDisabled).toBe(false);
    expect(result.current.cancelConfirmDisabled).toBe(false);
    expect(result.current.existingGas).toBeNull();
    expect(result.current.existingTx).toBeNull();
    expect(result.current.speedUpTxId).toBeNull();
    expect(result.current.cancelTxId).toBeNull();

    expect(typeof result.current.toggleRetry).toBe('function');
    expect(typeof result.current.onSpeedUpAction).toBe('function');
    expect(typeof result.current.onCancelAction).toBe('function');
    expect(typeof result.current.onSpeedUpCompleted).toBe('function');
    expect(typeof result.current.onCancelCompleted).toBe('function');
    expect(typeof result.current.speedUpTransaction).toBe('function');
    expect(typeof result.current.cancelTransaction).toBe('function');
    expect(typeof result.current.signQRTransaction).toBe('function');
    expect(typeof result.current.signLedgerTransaction).toBe('function');
    expect(typeof result.current.cancelUnsignedQRTransaction).toBe('function');
  });

  it('toggles retry and sets error message', () => {
    const { result } = renderHook(() => useUnifiedTxActions());

    act(() => result.current.toggleRetry('boom'));
    expect(result.current.retryIsOpen).toBe(true);
    expect(result.current.retryErrorMsg).toBe('boom');

    act(() => result.current.toggleRetry());
    expect(result.current.retryIsOpen).toBe(false);
  });

  describe('onSpeedUpAction', () => {
    it('closes both modals when open=false', () => {
      const { result } = renderHook(() => useUnifiedTxActions());

      act(() => result.current.onSpeedUpAction(false));
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUp1559IsOpen).toBe(false);
    });

    it('opens 1559 modal when isEIP1559Transaction=true', () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '1' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };

      act(() => result.current.onSpeedUpAction(true, gas, tx));

      expect(result.current.speedUp1559IsOpen).toBe(true);
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUpTxId).toBe('1');
      expect(result.current.existingGas).toBe(gas);
      expect(result.current.existingTx).toBe(tx);
    });

    it('opens legacy modal and computes disabled state', () => {
      (validateTransactionActionBalance as jest.Mock).mockReturnValueOnce(
        'err',
      );
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '2' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false };

      act(() => result.current.onSpeedUpAction(true, gas, tx));

      expect(validateTransactionActionBalance).toHaveBeenCalledWith(
        tx,
        '1.1',
        expect.any(Object),
      );
      expect(result.current.speedUpConfirmDisabled).toBe(true);
      expect(result.current.speedUpIsOpen).toBe(true);
      expect(result.current.speedUp1559IsOpen).toBe(false);
    });
  });

  describe('onCancelAction', () => {
    it('closes both modals when open=false', () => {
      const { result } = renderHook(() => useUnifiedTxActions());

      act(() => result.current.onCancelAction(false));
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancel1559IsOpen).toBe(false);
    });

    it('opens 1559 modal when isEIP1559Transaction=true', () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '3' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };

      act(() => result.current.onCancelAction(true, gas, tx));

      expect(result.current.cancel1559IsOpen).toBe(true);
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancelTxId).toBe('3');
      expect(result.current.existingGas).toBe(gas);
      expect(result.current.existingTx).toBe(tx);
    });

    it('opens legacy modal and computes disabled state', () => {
      (validateTransactionActionBalance as jest.Mock).mockReturnValueOnce(
        undefined,
      );
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '4' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false };

      act(() => result.current.onCancelAction(true, gas, tx));

      expect(validateTransactionActionBalance).toHaveBeenCalledWith(
        tx,
        '1.1',
        expect.any(Object),
      );
      expect(result.current.cancelConfirmDisabled).toBe(false);
      expect(result.current.cancelIsOpen).toBe(true);
      expect(result.current.cancel1559IsOpen).toBe(false);
    });
  });

  describe('speedUpTransaction', () => {
    it('success with legacy gas: controller computes rate when existing gasPrice !== 0', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '5' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false, gasPrice: '0x1' };

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(speedUpTx).toHaveBeenCalledWith('5', undefined);
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUp1559IsOpen).toBe(false);
      expect(result.current.existingGas).toBeNull();
      expect(result.current.speedUpTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('success with legacy gas: uses estimated gas price when existing gasPrice === 0', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '6' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false, gasPrice: 0 };

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(decGWEIToHexWEI).toHaveBeenCalledWith('25');
      expect(addHexPrefix).toHaveBeenCalledWith('abc');
      expect(speedUpTx).toHaveBeenCalledWith('6', { gasPrice: '0xabc' });
    });

    it('success with 1559 gas from modal values', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '7' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };
      const replacement = {
        suggestedMaxFeePerGasHex: '10',
        suggestedMaxPriorityFeePerGasHex: '2',
      };

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.speedUpTransaction(replacement);
      });

      expect(speedUpTx).toHaveBeenCalledWith('7', {
        maxFeePerGas: '0x10',
        maxPriorityFeePerGas: '0x2',
      });
    });

    it('handles error and opens retry', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '8' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.speedUpTransaction({ error: 'failed' });
      });

      expect(result.current.retryIsOpen).toBe(true);
      expect(result.current.retryErrorMsg).toBe('failed');
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUp1559IsOpen).toBe(false);
    });

    it('uses GasFeeController estimates when type is missing', async () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === (selectGasFeeEstimates as unknown)) {
          return {
            medium: { suggestedMaxFeePerGas: '25' },
            low: { suggestedMaxFeePerGas: '10' },
            high: { suggestedMaxFeePerGas: '40' },
          } as unknown;
        }
        return defaultSelectorImpl(selector);
      });

      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: 'fallback' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false, gasPrice: 0 };

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(decGWEIToHexWEI).toHaveBeenCalledWith('25');
      expect(addHexPrefix).toHaveBeenCalledWith('abc');
      expect(speedUpTx).toHaveBeenCalledWith('fallback', { gasPrice: '0xabc' });

      // Restore default selector for subsequent tests
      mockUseSelector.mockImplementation(defaultSelectorImpl);
    });
  });

  describe('cancelTransaction', () => {
    it('success with legacy gas: controller computes rate when existing gasPrice !== 0', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '9' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false, gasPrice: '0x1' };

      act(() => result.current.onCancelAction(true, gas, tx));
      await act(async () => {
        await result.current.cancelTransaction();
      });

      expect(
        engineContext.TransactionController.stopTransaction,
      ).toHaveBeenCalledWith('9', undefined);
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancel1559IsOpen).toBe(false);
      expect(result.current.existingGas).toBeNull();
      expect(result.current.cancelTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('success with 1559 gas from modal values', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '10' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };
      const replacement = {
        suggestedMaxFeePerGasHex: 'a',
        suggestedMaxPriorityFeePerGasHex: 'b',
      };

      act(() => result.current.onCancelAction(true, gas, tx));
      await act(async () => {
        await result.current.cancelTransaction(replacement);
      });

      expect(
        engineContext.TransactionController.stopTransaction,
      ).toHaveBeenCalledWith('10', {
        maxFeePerGas: '0xa',
        maxPriorityFeePerGas: '0xb',
      });
    });

    it('handles error and opens retry', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '11' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: false };

      act(() => result.current.onCancelAction(true, gas, tx));
      await act(async () => {
        await result.current.cancelTransaction({ error: 'nope' });
      });

      expect(result.current.retryIsOpen).toBe(true);
      expect(result.current.retryErrorMsg).toBe('nope');
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancel1559IsOpen).toBe(false);
    });
  });

  describe('QR flow helpers', () => {
    it('signQRTransaction resets keyring and accepts approval', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '12' } as unknown as TransactionMeta;

      await act(async () => {
        await result.current.signQRTransaction(tx);
      });

      expect(
        engineContext.KeyringController.resetQRKeyringState,
      ).toHaveBeenCalled();
      expect(engineContext.ApprovalController.accept).toHaveBeenCalledWith(
        '12',
        undefined,
        { waitForResult: true },
      );
    });

    it('cancelUnsignedQRTransaction rejects approval', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '13' } as unknown as TransactionMeta;

      await act(async () => {
        await result.current.cancelUnsignedQRTransaction(tx);
      });

      const rejectMock = engineContext.ApprovalController.reject as jest.Mock;
      expect(rejectMock).toHaveBeenCalled();
      const [id] = rejectMock.mock.calls[0];
      expect(id).toBe('13');
    });
  });

  describe('Ledger flow', () => {
    it('navigates to ledger modal and resolves completion for speed up', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '14' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };

      (createLedgerTransactionModalNavDetails as jest.Mock).mockImplementation(
        ({ onConfirmationComplete }) => [
          'LedgerModal',
          { onConfirmationComplete },
        ],
      );

      act(() => result.current.onSpeedUpAction(true, gas, tx));
      await act(async () => {
        await result.current.signLedgerTransaction({
          id: '14',
          speedUpParams: { type: 'SpeedUp' },
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'LedgerModal',
        expect.any(Object),
      );

      const [, params] = (mockNavigate as jest.Mock).mock.calls[0];
      // Simulate completion callback
      await act(async () => {
        await params.onConfirmationComplete(true);
      });

      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUp1559IsOpen).toBe(false);
    });

    it('navigates to ledger modal and resolves completion for cancel', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '15' } as unknown as TransactionMeta;
      const gas = { isEIP1559Transaction: true };

      (createLedgerTransactionModalNavDetails as jest.Mock).mockImplementation(
        ({ onConfirmationComplete }) => [
          'LedgerModal',
          { onConfirmationComplete },
        ],
      );

      act(() => result.current.onCancelAction(true, gas, tx));
      await act(async () => {
        await result.current.signLedgerTransaction({
          id: '15',
          replacementParams: { type: LedgerReplacementTxTypes.CANCEL },
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'LedgerModal',
        expect.any(Object),
      );

      const [, params] = (mockNavigate as jest.Mock).mock.calls[0];
      // Simulate completion callback
      await act(async () => {
        await params.onConfirmationComplete(true);
      });

      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancel1559IsOpen).toBe(false);
    });
  });
});
