import React from 'react';
import { BoxBackgroundColor } from '@metamask/design-system-react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';

import {
  useUnifiedTxActions,
  type SpeedUpCancelParams,
} from './useUnifiedTxActions';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import Engine from '../../../core/Engine';
import {
  type TransactionMeta,
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type GasFeeEstimates,
} from '@metamask/transaction-controller';
import { LedgerReplacementTxTypes } from '../../UI/LedgerModals/LedgerTransactionModal';
import { createQRSigningTransactionModalNavDetails } from '../../UI/QRHardware/QRSigningTransactionModal';

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
  getPreviousGasFromController: jest.fn(() => undefined),
}));

jest.mock('../../../util/transactions', () => ({
  validateTransactionActionBalance: jest.fn(),
}));

jest.mock('../../UI/QRHardware/QRSigningTransactionModal', () => ({
  createQRSigningTransactionModalNavDetails: jest
    .fn()
    .mockReturnValue(['QRSigningModal', {}]),
}));

jest.mock('@metamask/rpc-errors', () => ({
  providerErrors: {
    userRejectedRequest: jest.fn(() => ({ code: 4001 })),
  },
}));

jest.mock('../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

const mockExecuteHardwareWalletOperation = jest.fn();
jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    ensureDeviceReady: jest.fn(),
    setTargetWalletType: jest.fn(),
    showAwaitingConfirmation: jest.fn(),
    hideAwaitingConfirmation: jest.fn(),
    showHardwareWalletError: jest.fn(),
  }),
  executeHardwareWalletOperation: (...args: unknown[]) =>
    mockExecuteHardwareWalletOperation(...args),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TransactionController: {
      stopTransaction: jest.fn(),
      getTransactions: jest.fn(() => []),
    },
    ApprovalController: {
      acceptRequest: jest.fn(),
      rejectRequest: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

import { decGWEIToHexWEI } from '../../../util/conversions';
import { addHexPrefix } from '../../../util/number';
import {
  speedUpTransaction as speedUpTx,
  getPreviousGasFromController,
} from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { isHardwareAccount } from '../../../util/address';

const mockShowToast = jest.fn();

const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

function TxActionsTestWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    ToastContext.Provider,
    { value: { toastRef: mockToastRef } },
    children,
  );
}

const renderUnifiedTxActions = () =>
  renderHook(() => useUnifiedTxActions(), {
    wrapper: TxActionsTestWrapper,
  });

describe('useUnifiedTxActions', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  interface EngineContextMock {
    TransactionController: {
      stopTransaction: jest.Mock;
      getTransactions: jest.Mock;
    };
    ApprovalController: { acceptRequest: jest.Mock; rejectRequest: jest.Mock };
  }

  const engineContext = Engine.context as unknown as EngineContextMock;
  let defaultSelectorImpl: (selector: unknown) => unknown;

  beforeEach(() => {
    jest.resetAllMocks();
    engineContext.TransactionController.getTransactions = jest.fn(() => []);
    mockShowToast.mockClear();

    (createQRSigningTransactionModalNavDetails as jest.Mock).mockReturnValue([
      'QRSigningModal',
      {},
    ]);
    mockExecuteHardwareWalletOperation.mockResolvedValue(true);

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
    const { result } = renderUnifiedTxActions();

    expect(result.current.speedUpIsOpen).toBe(false);
    expect(result.current.cancelIsOpen).toBe(false);
    expect(result.current.confirmDisabled).toBe(false);
    expect(result.current.existingTx).toBeNull();
    expect(result.current.speedUpTxId).toBeNull();
    expect(result.current.cancelTxId).toBeNull();

    expect(typeof result.current.onSpeedUpAction).toBe('function');
    expect(typeof result.current.onCancelAction).toBe('function');
    expect(typeof result.current.onSpeedUpCancelCompleted).toBe('function');
    expect(typeof result.current.speedUpTransaction).toBe('function');
    expect(typeof result.current.cancelTransaction).toBe('function');
    expect(typeof result.current.signQRTransaction).toBe('function');
    expect(typeof result.current.signLedgerTransaction).toBe('function');
    expect(typeof result.current.cancelUnsignedQRTransaction).toBe('function');
  });

  describe('onSpeedUpAction', () => {
    it('closes both modals when open=false', () => {
      const { result } = renderUnifiedTxActions();

      act(() => result.current.onSpeedUpAction(false));
      expect(result.current.speedUpIsOpen).toBe(false);
    });

    it('opens speed up modal when isEIP1559Transaction=true', () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '1' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));

      expect(result.current.speedUpIsOpen).toBe(true);
      expect(result.current.speedUpTxId).toBe('1');
      expect(result.current.existingTx).toBe(tx);
    });

    it('opens legacy modal and computes disabled state', () => {
      (validateTransactionActionBalance as jest.Mock).mockReturnValueOnce(
        'err',
      );
      const { result } = renderUnifiedTxActions();
      const tx = { id: '2' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));

      expect(validateTransactionActionBalance).toHaveBeenCalledWith(
        tx,
        '1.1',
        expect.any(Object),
      );
      expect(result.current.confirmDisabled).toBe(true);
      expect(result.current.speedUpIsOpen).toBe(true);
    });
  });

  describe('onCancelAction', () => {
    it('closes both modals when open=false', () => {
      const { result } = renderUnifiedTxActions();

      act(() => result.current.onCancelAction(false));
      expect(result.current.cancelIsOpen).toBe(false);
    });

    it('opens cancel modal when isEIP1559Transaction=true', () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '3' } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));

      expect(result.current.cancelIsOpen).toBe(true);
      expect(result.current.cancelTxId).toBe('3');
      expect(result.current.existingTx).toBe(tx);
    });

    it('opens legacy modal and computes disabled state', () => {
      (validateTransactionActionBalance as jest.Mock).mockReturnValueOnce(
        undefined,
      );
      const { result } = renderUnifiedTxActions();
      const tx = { id: '4' } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));

      expect(validateTransactionActionBalance).toHaveBeenCalledWith(
        tx,
        '1.1',
        expect.any(Object),
      );
      expect(result.current.confirmDisabled).toBe(false);
      expect(result.current.cancelIsOpen).toBe(true);
    });
  });

  describe('speedUpTransaction', () => {
    it('success with legacy gas: controller computes rate when existing gasPrice !== 0', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = {
        id: '5',
        txParams: { gasPrice: '0x1' },
      } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(speedUpTx).toHaveBeenCalledWith('5', undefined);
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUpTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('success with legacy gas: uses estimated gas price when existing gasPrice === 0', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = {
        id: '6',
        txParams: { gasPrice: '0x0' },
      } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(decGWEIToHexWEI).toHaveBeenCalledWith('25');
      expect(addHexPrefix).toHaveBeenCalledWith('abc');
      expect(speedUpTx).toHaveBeenCalledWith('6', { gasPrice: '0xabc' });
    });

    it('success with 1559 gas from modal values (controller shape)', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '7' } as unknown as TransactionMeta;
      const replacement = {
        maxFeePerGas: '0x10',
        maxPriorityFeePerGas: '0x2',
      };

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction(replacement);
      });

      expect(speedUpTx).toHaveBeenCalledWith('7', {
        maxFeePerGas: '0x10',
        maxPriorityFeePerGas: '0x2',
      });
    });

    it('handles error and shows toast', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '8' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction({
          error: 'failed',
        } as SpeedUpCancelParams);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.CircleX,
          iconColor: IconColor.Error,
          backgroundColor: BoxBackgroundColor.Transparent,
          descriptionOptions: { description: 'failed' },
          hasNoTimeout: false,
        }),
      );
      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUpTxId).toBe('8');
      expect(result.current.existingTx).toBe(tx);
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

      const { result } = renderUnifiedTxActions();
      const tx = {
        id: 'fallback',
        txParams: { gasPrice: '0x0' },
      } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(decGWEIToHexWEI).toHaveBeenCalledWith('25');
      expect(addHexPrefix).toHaveBeenCalledWith('abc');
      expect(speedUpTx).toHaveBeenCalledWith('fallback', { gasPrice: '0xabc' });

      // Restore default selector for subsequent tests
      mockUseSelector.mockImplementation(defaultSelectorImpl);
    });

    it('clamps EIP-1559 priority fee up to previousGas × rate when below minimum', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: 'clamp-speedup' } as unknown as TransactionMeta;

      (getPreviousGasFromController as jest.Mock).mockImplementation(
        (txId: string) =>
          txId === 'clamp-speedup'
            ? { maxFeePerGas: '0x64', maxPriorityFeePerGas: '0x64' }
            : undefined,
      );

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction({
          maxFeePerGas: '0x3e8', // 1000 (above min 110)
          maxPriorityFeePerGas: '0x5', // 5 (below min 110)
        });
      });

      expect(speedUpTx).toHaveBeenCalledWith('clamp-speedup', {
        maxFeePerGas: '0x3e8',
        maxPriorityFeePerGas: '0x6e', // ceil(100 * 1.1) = 110 = 0x6e
      });
    });
  });

  describe('cancelTransaction', () => {
    it('success with legacy gas: controller computes rate when existing gasPrice !== 0', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = {
        id: '9',
        txParams: { gasPrice: '0x1' },
      } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));
      await act(async () => {
        await result.current.cancelTransaction();
      });

      expect(
        engineContext.TransactionController.stopTransaction,
      ).toHaveBeenCalledWith('9', undefined);
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancelTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('success with 1559 gas from modal values (controller shape)', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '10' } as unknown as TransactionMeta;
      const replacement = {
        maxFeePerGas: '0xa',
        maxPriorityFeePerGas: '0xb',
      };

      act(() => result.current.onCancelAction(true, tx));
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

    it('handles error and shows toast', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '11' } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));
      await act(async () => {
        await result.current.cancelTransaction({
          error: 'nope',
        } as SpeedUpCancelParams);
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.CircleX,
          iconColor: IconColor.Error,
          backgroundColor: BoxBackgroundColor.Transparent,
          descriptionOptions: { description: 'nope' },
          hasNoTimeout: false,
        }),
      );
      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancelTxId).toBe('11');
      expect(result.current.existingTx).toBe(tx);
    });

    it('clamps EIP-1559 priority fee up to previousGas × rate when below minimum', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: 'clamp-cancel' } as unknown as TransactionMeta;

      (getPreviousGasFromController as jest.Mock).mockImplementation(
        (txId: string) =>
          txId === 'clamp-cancel'
            ? { maxFeePerGas: '0x64', maxPriorityFeePerGas: '0x64' }
            : undefined,
      );

      act(() => result.current.onCancelAction(true, tx));
      await act(async () => {
        await result.current.cancelTransaction({
          maxFeePerGas: '0x3e8', // 1000 (above min 110)
          maxPriorityFeePerGas: '0x5', // 5 (below min 110)
        });
      });

      expect(
        engineContext.TransactionController.stopTransaction,
      ).toHaveBeenCalledWith('clamp-cancel', {
        maxFeePerGas: '0x3e8',
        maxPriorityFeePerGas: '0x6e', // ceil(100 * 1.1) = 110
      });
    });
  });

  describe('QR flow helpers', () => {
    it('signQRTransaction navigates to QR signing modal', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '12' } as unknown as TransactionMeta;

      await act(async () => {
        await result.current.signQRTransaction(tx);
      });

      expect(createQRSigningTransactionModalNavDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: '12',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('QRSigningModal', {});
    });

    it('cancelUnsignedQRTransaction rejects approval', async () => {
      const { result } = renderUnifiedTxActions();
      const tx = { id: '13' } as unknown as TransactionMeta;

      await act(async () => {
        await result.current.cancelUnsignedQRTransaction(tx);
      });

      const rejectMock = engineContext.ApprovalController
        .rejectRequest as jest.Mock;
      expect(rejectMock).toHaveBeenCalled();
      const [id] = rejectMock.mock.calls[0];
      expect(id).toBe('13');
    });
  });

  describe('Ledger flow', () => {
    it('uses the shared hardware wallet execution flow for speed up', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '14' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.signLedgerTransaction({
          id: '14',
          speedUpParams: { type: 'SpeedUp' },
        });
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith({
        address: '',
        operationType: 'transaction',
        ensureDeviceReady: expect.any(Function),
        setTargetWalletType: expect.any(Function),
        showAwaitingConfirmation: expect.any(Function),
        hideAwaitingConfirmation: expect.any(Function),
        showHardwareWalletError: expect.any(Function),
        execute: expect.any(Function),
        onRejected: expect.any(Function),
      });
      expect(result.current.speedUpIsOpen).toBe(false);
    });

    it('uses the shared hardware wallet execution flow for cancel', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: '15' } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));
      await act(async () => {
        await result.current.signLedgerTransaction({
          id: '15',
          replacementParams: { type: LedgerReplacementTxTypes.CANCEL },
        });
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith({
        address: '',
        operationType: 'transaction',
        ensureDeviceReady: expect.any(Function),
        setTargetWalletType: expect.any(Function),
        showAwaitingConfirmation: expect.any(Function),
        hideAwaitingConfirmation: expect.any(Function),
        showHardwareWalletError: expect.any(Function),
        execute: expect.any(Function),
        onRejected: expect.any(Function),
      });
      expect(result.current.cancelIsOpen).toBe(false);
    });

    it('accepts a plain Ledger signing request when no replacement params are present', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());

      await act(async () => {
        await result.current.signLedgerTransaction({
          id: 'plain-ledger-sign',
        });
      });

      const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
        .execute as () => Promise<void>;

      await act(async () => {
        await executeArg();
      });

      const acceptMock = engineContext.ApprovalController
        .acceptRequest as jest.Mock;
      expect(acceptMock).toHaveBeenCalledWith('plain-ledger-sign', undefined, {
        waitForResult: true,
      });
    });

    describe('Ledger account transactions', () => {
      beforeEach(() => {
        (isHardwareAccount as jest.Mock).mockReturnValue(true);
        mockExecuteHardwareWalletOperation.mockResolvedValue(true);
      });

      afterEach(() => {
        (isHardwareAccount as jest.Mock).mockReturnValue(false);
      });

      describe('speedUpTransaction with Ledger account', () => {
        it('calls signLedgerTransaction instead of speedUpTx', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-speedup-1' } as unknown as TransactionMeta;
          const replacement = {
            maxFeePerGas: '0xff',
            maxPriorityFeePerGas: '0xee',
          };

          act(() => result.current.onSpeedUpAction(true, tx));
          await act(async () => {
            await result.current.speedUpTransaction(replacement);
          });

          expect(mockExecuteHardwareWalletOperation).toHaveBeenCalled();
          expect(speedUpTx).not.toHaveBeenCalled();
        });

        it('closes the speed-up modal after a successful hardware-wallet flow', async () => {
          const { result } = renderHook(() => useUnifiedTxActions());
          const tx = { id: 'ledger-speedup-2' } as unknown as TransactionMeta;

          act(() => result.current.onSpeedUpAction(true, tx));
          await act(async () => {
            await result.current.speedUpTransaction({
              maxFeePerGas: '0xaa',
              maxPriorityFeePerGas: '0xbb',
            });
          });

          expect(result.current.speedUpIsOpen).toBe(false);
          expect(result.current.speedUpTxId).toBeNull();
        });

        it('passes the replacement transaction through the shared execute callback', async () => {
          const { result } = renderHook(() => useUnifiedTxActions());
          const tx = { id: 'ledger-speedup-3' } as unknown as TransactionMeta;

          act(() => result.current.onSpeedUpAction(true, tx));
          await act(async () => {
            await result.current.speedUpTransaction({} as SpeedUpCancelParams);
          });

          const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
            .execute as () => Promise<void>;

          await act(async () => {
            await executeArg();
          });

          expect(speedUpTx).toHaveBeenCalledWith('ledger-speedup-3', {
            gasPrice: '0xabc',
          });
        });

        it('handles legacy transaction by using gasPrice', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = {
            id: 'ledger-speedup-legacy',
            txParams: { gasPrice: '0x123' },
          } as unknown as TransactionMeta;

          act(() => result.current.onSpeedUpAction(true, tx));
          await act(async () => {
            await result.current.speedUpTransaction({} as SpeedUpCancelParams);
          });

          const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
            .execute as () => Promise<void>;

          await act(async () => {
            await executeArg();
          });

          expect(speedUpTx).toHaveBeenCalledWith(
            'ledger-speedup-legacy',
            undefined,
          );
        });

        it('throws error before Ledger signing when transactionObject has error', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-speedup-4' } as unknown as TransactionMeta;

          act(() => result.current.onSpeedUpAction(true, tx));
          await act(async () => {
            await result.current.speedUpTransaction({
              error: 'gas error',
            } as SpeedUpCancelParams);
          });

          expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: ToastVariants.Icon,
              iconName: IconName.CircleX,
              iconColor: IconColor.Error,
              backgroundColor: BoxBackgroundColor.Transparent,
              descriptionOptions: { description: 'gas error' },
              hasNoTimeout: false,
            }),
          );
          expect(result.current.speedUpIsOpen).toBe(false);
          expect(result.current.speedUpTxId).toBe('ledger-speedup-4');
        });

        it('throws error before Ledger signing when speedUpTxId is missing', async () => {
          const { result } = renderUnifiedTxActions();

          await act(async () => {
            await result.current.speedUpTransaction({
              maxFeePerGas: '0xcc',
              maxPriorityFeePerGas: '0xdd',
            });
          });

          expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: ToastVariants.Icon,
              iconName: IconName.CircleX,
              iconColor: IconColor.Error,
              backgroundColor: BoxBackgroundColor.Transparent,
              descriptionOptions: {
                description: 'Missing transaction id for speed up',
              },
              hasNoTimeout: false,
            }),
          );
          expect(result.current.speedUpIsOpen).toBe(false);
          expect(result.current.speedUpTxId).toBeNull();
        });

        it('cleans up modal state when the hardware-wallet flow reports rejection', async () => {
          mockExecuteHardwareWalletOperation.mockImplementationOnce(
            async ({ onRejected }) => {
              await onRejected();
              return false;
            },
          );
          const { result } = renderUnifiedTxActions();
          const tx = {
            id: 'ledger-speedup-reject',
          } as unknown as TransactionMeta;

          act(() => result.current.onSpeedUpAction(true, tx));

          expect(result.current.speedUpIsOpen).toBe(true);
          expect(result.current.speedUpTxId).toBe('ledger-speedup-reject');

          await act(async () => {
            await result.current.speedUpTransaction({
              maxFeePerGas: '0xff',
              maxPriorityFeePerGas: '0xee',
            });
          });

          expect(result.current.speedUpIsOpen).toBe(false);
          expect(result.current.speedUpTxId).toBeNull();
          expect(result.current.existingTx).toBeNull();
        });
      });

      describe('cancelTransaction with Ledger account', () => {
        it('calls signLedgerTransaction instead of stopTransaction', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-cancel-1' } as unknown as TransactionMeta;
          const replacement = {
            maxFeePerGas: '0x11',
            maxPriorityFeePerGas: '0x22',
          };

          act(() => result.current.onCancelAction(true, tx));
          await act(async () => {
            await result.current.cancelTransaction(replacement);
          });

          expect(mockExecuteHardwareWalletOperation).toHaveBeenCalled();
          expect(
            engineContext.TransactionController.stopTransaction,
          ).not.toHaveBeenCalled();
        });

        it('closes the cancel modal after a successful hardware-wallet flow', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-cancel-2' } as unknown as TransactionMeta;

          act(() => result.current.onCancelAction(true, tx));
          await act(async () => {
            await result.current.cancelTransaction({
              maxFeePerGas: '0x33',
              maxPriorityFeePerGas: '0x44',
            });
          });

          expect(result.current.cancelIsOpen).toBe(false);
          expect(result.current.cancelTxId).toBeNull();
        });

        it('handles empty gas fee hex values by falling back to legacy gas price', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-cancel-3' } as unknown as TransactionMeta;

          act(() => result.current.onCancelAction(true, tx));
          await act(async () => {
            await result.current.cancelTransaction({} as SpeedUpCancelParams);
          });

          const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
            .execute as () => Promise<void>;

          await act(async () => {
            await executeArg();
          });

          expect(
            engineContext.TransactionController.stopTransaction,
          ).toHaveBeenCalledWith('ledger-cancel-3', {
            gasPrice: '0xabc',
          });
        });

        it('defers to TransactionController rate multiplication for legacy tx with existing gasPrice', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = {
            id: 'ledger-cancel-legacy',
            txParams: { gasPrice: '0x456' },
          } as unknown as TransactionMeta;

          act(() => result.current.onCancelAction(true, tx));
          await act(async () => {
            await result.current.cancelTransaction({} as SpeedUpCancelParams);
          });

          // legacyGasFee is undefined because getCancelOrSpeedupValues returns
          // undefined when existing gasPrice is non-zero, letting the
          // TransactionController apply its internal rate multiplication (1.1x).
          const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
            .execute as () => Promise<void>;

          await act(async () => {
            await executeArg();
          });

          expect(
            engineContext.TransactionController.stopTransaction,
          ).toHaveBeenCalledWith('ledger-cancel-legacy', undefined);
        });

        it('throws error before Ledger signing when transactionObject has error', async () => {
          const { result } = renderUnifiedTxActions();
          const tx = { id: 'ledger-cancel-4' } as unknown as TransactionMeta;

          act(() => result.current.onCancelAction(true, tx));
          await act(async () => {
            await result.current.cancelTransaction({
              error: 'cancel error',
            } as SpeedUpCancelParams);
          });

          expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: ToastVariants.Icon,
              iconName: IconName.CircleX,
              iconColor: IconColor.Error,
              backgroundColor: BoxBackgroundColor.Transparent,
              descriptionOptions: { description: 'cancel error' },
              hasNoTimeout: false,
            }),
          );
          expect(result.current.cancelIsOpen).toBe(false);
          expect(result.current.cancelTxId).toBe('ledger-cancel-4');
        });

        it('throws error before Ledger signing when cancelTxId is missing', async () => {
          const { result } = renderUnifiedTxActions();

          await act(async () => {
            await result.current.cancelTransaction({
              maxFeePerGas: '0x55',
              maxPriorityFeePerGas: '0x66',
            });
          });

          expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
          expect(mockShowToast).toHaveBeenCalledWith(
            expect.objectContaining({
              variant: ToastVariants.Icon,
              iconName: IconName.CircleX,
              iconColor: IconColor.Error,
              backgroundColor: BoxBackgroundColor.Transparent,
              descriptionOptions: {
                description: 'Missing transaction id for cancel',
              },
              hasNoTimeout: false,
            }),
          );
          expect(result.current.cancelIsOpen).toBe(false);
          expect(result.current.cancelTxId).toBeNull();
        });

        it('cleans up modal state when the hardware-wallet flow reports rejection', async () => {
          mockExecuteHardwareWalletOperation.mockImplementationOnce(
            async ({ onRejected }) => {
              await onRejected();
              return false;
            },
          );
          const { result } = renderUnifiedTxActions();
          const tx = {
            id: 'ledger-cancel-reject',
          } as unknown as TransactionMeta;

          act(() => result.current.onCancelAction(true, tx));

          expect(result.current.cancelIsOpen).toBe(true);
          expect(result.current.cancelTxId).toBe('ledger-cancel-reject');

          await act(async () => {
            await result.current.cancelTransaction({
              maxFeePerGas: '0x11',
              maxPriorityFeePerGas: '0x22',
            });
          });

          expect(result.current.cancelIsOpen).toBe(false);
          expect(result.current.cancelTxId).toBeNull();
          expect(result.current.existingTx).toBeNull();
        });
      });
    });

    it('signLedgerTransaction does not close modal when didComplete is false and not rejected', async () => {
      mockExecuteHardwareWalletOperation.mockResolvedValueOnce(false);
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: 'hw-no-complete' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));

      await act(async () => {
        await result.current.signLedgerTransaction({
          id: 'hw-no-complete',
          replacementParams: { type: LedgerReplacementTxTypes.SPEED_UP },
        });
      });

      expect(result.current.speedUpIsOpen).toBe(true);
      expect(result.current.speedUpTxId).toBe('hw-no-complete');
    });
  });

  describe('action handler edge cases', () => {
    it('onSpeedUpAction does nothing when open=true but no tx provided', () => {
      const { result } = renderHook(() => useUnifiedTxActions());

      act(() => result.current.onSpeedUpAction(true));

      expect(result.current.speedUpIsOpen).toBe(false);
      expect(result.current.speedUpTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('onCancelAction does nothing when open=true but no tx provided', () => {
      const { result } = renderHook(() => useUnifiedTxActions());

      act(() => result.current.onCancelAction(true));

      expect(result.current.cancelIsOpen).toBe(false);
      expect(result.current.cancelTxId).toBeNull();
      expect(result.current.existingTx).toBeNull();
    });

    it('onSpeedUpAction handles tx without id property', () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = {} as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));

      expect(result.current.speedUpIsOpen).toBe(true);
      expect(result.current.speedUpTxId).toBeNull();
      expect(result.current.existingTx).toBe(tx);
    });

    it('onCancelAction handles tx without id property', () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = {} as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));

      expect(result.current.cancelIsOpen).toBe(true);
      expect(result.current.cancelTxId).toBeNull();
      expect(result.current.existingTx).toBe(tx);
    });
  });

  describe('gas estimation edge cases', () => {
    it('uses estimated gas when existing tx gasPrice is "0x00" (parses to 0)', async () => {
      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = {
        id: 'double-zero',
        txParams: { gasPrice: '0x00' },
      } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(decGWEIToHexWEI).toHaveBeenCalledWith('25');
      expect(speedUpTx).toHaveBeenCalledWith('double-zero', {
        gasPrice: '0xabc',
      });
    });

    it('handles non-Error thrown during speedUpTransaction', async () => {
      (speedUpTx as jest.Mock).mockRejectedValueOnce('string error');
      const { result } = renderUnifiedTxActions();
      const tx = { id: 'string-err' } as unknown as TransactionMeta;

      act(() => result.current.onSpeedUpAction(true, tx));
      await act(async () => {
        await result.current.speedUpTransaction();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.CircleX,
          iconColor: IconColor.Error,
          backgroundColor: BoxBackgroundColor.Transparent,
        }),
      );
    });

    it('handles non-Error thrown during cancelTransaction', async () => {
      engineContext.TransactionController.stopTransaction.mockRejectedValueOnce(
        42,
      );
      const { result } = renderUnifiedTxActions();
      const tx = { id: 'number-err' } as unknown as TransactionMeta;

      act(() => result.current.onCancelAction(true, tx));
      await act(async () => {
        await result.current.cancelTransaction();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.CircleX,
          iconColor: IconColor.Error,
          backgroundColor: BoxBackgroundColor.Transparent,
        }),
      );
    });
  });

  describe('signQRTransaction onConfirmationComplete callback', () => {
    it('creates the callback and it can be invoked without error', async () => {
      let capturedCallback: (() => void) | undefined;
      (
        createQRSigningTransactionModalNavDetails as jest.Mock
      ).mockImplementationOnce(
        (params: { onConfirmationComplete?: () => void }) => {
          capturedCallback = params.onConfirmationComplete;
          return ['QRSigningModal', {}];
        },
      );

      const { result } = renderHook(() => useUnifiedTxActions());
      const tx = { id: 'qr-cb' } as unknown as TransactionMeta;

      await act(async () => {
        await result.current.signQRTransaction(tx);
      });

      expect(capturedCallback).toBeDefined();
      act(() => {
        if (capturedCallback) {
          capturedCallback();
        }
      });
    });
  });
});
