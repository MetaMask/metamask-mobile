import { act, renderHook } from '@testing-library/react-hooks';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { useUnifiedTxActions } from './useUnifiedTxActions';
import {
  executeHardwareWalletOperation,
  useHardwareWallet,
} from '../../../core/HardwareWallet';
import {
  speedUpTransaction,
  getPreviousGasFromController,
} from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { isHardwareAccount } from '../../../util/address';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ToastContext: ReactActual.createContext({
      toastRef: { current: { showToast: jest.fn() } },
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      ApprovalController: {
        acceptRequest: jest.fn(),
        rejectRequest: jest.fn(),
      },
      TransactionController: {
        stopTransaction: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../core/HardwareWallet', () => ({
  executeHardwareWalletOperation: jest.fn(async ({ execute }) => {
    await execute();
    return true;
  }),
  useHardwareWallet: jest.fn(() => ({
    ensureDeviceReady: jest.fn(),
    hideAwaitingConfirmation: jest.fn(),
    setPendingOperationAddress: jest.fn(),
    showAwaitingConfirmation: jest.fn(),
    showHardwareWalletError: jest.fn(),
  })),
}));

jest.mock('../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('../../../util/confirmation/gas', () => ({
  getGasValuesForReplacement: jest.fn(
    (params) => params ?? { gasPrice: '0x2' },
  ),
  getMediumGasPriceHex: jest.fn(() => '0x2'),
  normalizeReplacementGasFeeParams: jest.fn((params) => params),
}));

jest.mock('../../../util/transaction-controller', () => ({
  getPreviousGasFromController: jest.fn(() => ({ gasPrice: '0x1' })),
  speedUpTransaction: jest.fn(),
}));

jest.mock('../../../util/transactions', () => ({
  validateTransactionActionBalance: jest.fn(() => false),
}));

jest.mock('../../../util/confirmation/transactions', () => ({
  getTransactionUpdateErrorToastOptions: jest.fn((error) => ({ error })),
}));

jest.mock('../../UI/QRHardware/QRSigningTransactionModal', () => ({
  QRSignMode: { Cancel: 'Cancel', SpeedUp: 'SpeedUp' },
  createQRSigningTransactionModalNavDetails: jest.fn((params) => [
    'QRModal',
    params,
  ]),
}));

const mockNavigate = jest.fn();
const mockUseSelector = useSelector as unknown as jest.Mock;
const mockIsHardwareAccount = isHardwareAccount as unknown as jest.Mock;
let hardwareAccountType: 'ledger' | 'qr' | undefined;

const tx = {
  chainId: '0x1',
  id: 'tx-id',
  networkClientId: 'mainnet',
  status: 'submitted',
  time: 1,
  type: TransactionType.simpleSend,
  txParams: {
    from: '0xselected',
    gasPrice: '0x0',
    to: '0xrecipient',
    value: '0x1',
  },
} as unknown as TransactionMeta;

describe('useUnifiedTxActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    hardwareAccountType = undefined;
    mockIsHardwareAccount.mockImplementation(
      (_address: string, keyringTypes: string[]) =>
        keyringTypes.includes(
          hardwareAccountType === 'ledger'
            ? 'Ledger Hardware'
            : hardwareAccountType === 'qr'
              ? 'QR Hardware Wallet Device'
              : 'none',
        ),
    );
    mockUseSelector
      .mockReturnValueOnce({ medium: { suggestedMaxFeePerGas: '2' } })
      .mockReturnValueOnce({})
      .mockReturnValueOnce('0xselected');
  });

  it('opens and closes speed-up/cancel modal state and sets disabled from balance validation', () => {
    (validateTransactionActionBalance as jest.Mock).mockReturnValueOnce(true);
    const { result } = renderHook(() => useUnifiedTxActions());

    act(() => {
      result.current.onSpeedUpAction(true, tx);
    });

    expect(result.current.speedUpIsOpen).toBe(true);
    expect(result.current.speedUpTxId).toBe('tx-id');
    expect(result.current.confirmDisabled).toBe(true);

    act(() => {
      result.current.onSpeedUpCancelCompleted();
    });

    expect(result.current.speedUpIsOpen).toBe(false);
    expect(result.current.speedUpTxId).toBeNull();

    act(() => {
      result.current.onCancelAction(true, tx);
    });

    expect(result.current.cancelIsOpen).toBe(true);
    expect(result.current.cancelTxId).toBe('tx-id');
  });

  it('executes software speed-up and cancel actions', async () => {
    const { result } = renderHook(() => useUnifiedTxActions());

    act(() => {
      result.current.onSpeedUpAction(true, tx);
    });
    await act(async () => {
      await result.current.speedUpTransaction({ gasPrice: '0x0' });
    });

    expect(getPreviousGasFromController).toHaveBeenCalledWith('tx-id');
    expect(speedUpTransaction).toHaveBeenCalledWith('tx-id', {
      gasPrice: '0x2',
    });
    expect(result.current.speedUpIsOpen).toBe(false);

    act(() => {
      result.current.onCancelAction(true, tx);
    });
    await act(async () => {
      await result.current.cancelTransaction({ gasPrice: '0x3' });
    });

    expect(
      Engine.context.TransactionController.stopTransaction,
    ).toHaveBeenCalledWith('tx-id', { gasPrice: '0x3' });
  });

  it('routes QR hardware replacement transactions through the QR modal', async () => {
    hardwareAccountType = 'qr';
    const { result } = renderHook(() => useUnifiedTxActions());

    act(() => {
      result.current.onSpeedUpAction(true, tx);
    });
    await act(async () => {
      await result.current.speedUpTransaction({ gasPrice: '0x3' });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'QRModal',
      expect.objectContaining({
        transactionId: 'tx-id',
        signMode: 'SpeedUp',
      }),
    );
  });

  it('executes Ledger signing and direct QR/unsigned helpers', async () => {
    mockIsHardwareAccount.mockImplementation(() => true);
    const { result } = renderHook(() => useUnifiedTxActions());

    await act(async () => {
      await result.current.signLedgerTransaction({
        id: 'tx-id',
        replacementParams: {
          maxFeePerGas: '0x4',
          type: 'cancel',
        } as never,
      });
    });

    expect(executeHardwareWalletOperation).toHaveBeenCalled();
    expect(
      Engine.context.TransactionController.stopTransaction,
    ).toHaveBeenCalledWith(
      'tx-id',
      expect.objectContaining({ maxFeePerGas: '0x4' }),
    );

    await act(async () => {
      await result.current.signQRTransaction(tx);
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'QRModal',
      expect.objectContaining({ transactionId: 'tx-id' }),
    );

    await act(async () => {
      await result.current.cancelUnsignedQRTransaction(tx);
    });
    expect(
      Engine.context.ApprovalController.rejectRequest,
    ).toHaveBeenCalledWith('tx-id', expect.objectContaining({ code: 4001 }));
  });

  it('throws from Ledger signing when no selected address exists', async () => {
    mockUseSelector.mockReset();
    mockUseSelector
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce(undefined);
    const { result } = renderHook(() => useUnifiedTxActions());

    await expect(
      result.current.signLedgerTransaction({ id: 'ledger-tx' }),
    ).rejects.toThrow('Missing selected address');
    expect(useHardwareWallet).toHaveBeenCalled();
  });
});
