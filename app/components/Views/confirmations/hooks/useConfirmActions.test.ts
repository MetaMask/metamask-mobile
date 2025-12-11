import { useNavigation } from '@react-navigation/native';
import { TransactionType } from '@metamask/transaction-controller';

import Engine from '../../../../core/Engine';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import PPOMUtil from '../../../../lib/ppom/ppom-util';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../context/qr-hardware-context/qr-hardware-context';
// eslint-disable-next-line import/no-namespace
import * as LedgerContext from '../context/ledger-context/ledger-context';
import { useTransactionConfirm } from './transactions/useTransactionConfirm';
import { useConfirmActions } from './useConfirmActions';

jest.mock('./transactions/useTransactionConfirm');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x0000000000000000000000000000000000000000'],
          },
        ],
      },
    },
  },
}));

jest.mock('./gas/useGasFeeToken');

jest.mock('../../../../util/transaction-controller', () => ({
  ...jest.requireActual('../../../../util/transaction-controller'),
  updateTransaction: jest.fn(),
}));

const mockCaptureSignatureMetrics = jest.fn();
jest.mock('./signatures/useSignatureMetrics', () => ({
  useSignatureMetrics: () => ({
    captureSignatureMetrics: mockCaptureSignatureMetrics,
  }),
}));

const flushPromises = async () => await new Promise(process.nextTick);

const createUseLedgerContextSpy = (mockedValues = {}) => {
  jest.spyOn(LedgerContext, 'useLedgerContext').mockReturnValue({
    ledgerSigningInProgress: false,
    openLedgerSignModal: jest.fn(),
    ...mockedValues,
  } as unknown as LedgerContext.LedgerContextType);
};

describe('useConfirmAction', () => {
  const useTransactionConfirmMock = jest.mocked(useTransactionConfirm);
  const useNavigationMock = jest.mocked(useNavigation);
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationMock.mockReturnValue({
      goBack: jest.fn(),
      navigate: navigateMock,
    } as unknown as ReturnType<typeof useNavigation>);

    useTransactionConfirmMock.mockReturnValue({
      onConfirm: jest.fn(),
    });
  });

  it('call setScannerVisible if QR signing is in progress', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockSetScannerVisible = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isSigningQRObject: true,
      setScannerVisible: mockSetScannerVisible,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(mockSetScannerVisible).toHaveBeenCalledTimes(1);
    expect(mockSetScannerVisible).toHaveBeenLastCalledWith(true);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(0);
    await flushPromises();
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(0);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(0);
  });

  it('open LedgerSignModal if confirm button is clicked when signing using ledger account', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({
      ledgerSigningInProgress: true,
      openLedgerSignModal: mockOpenLedgerSignModal,
    });
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(mockOpenLedgerSignModal).toHaveBeenCalledTimes(1);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(0);
  });

  it('does not call signature related methods when onConfirm is called if confirmation is not of type signature', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({ openLedgerSignModal: mockOpenLedgerSignModal });
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onConfirm();
    await flushPromises();
    expect(mockCaptureSignatureMetrics).not.toHaveBeenCalled();
    expect(clearSecurityAlertResponseSpy).not.toHaveBeenCalled();
    expect(mockOpenLedgerSignModal).not.toHaveBeenCalled();
  });

  it('call required callbacks when confirm button is clicked', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({ openLedgerSignModal: mockOpenLedgerSignModal });
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
    expect(mockOpenLedgerSignModal).not.toHaveBeenCalled();
  });

  it('does not call signature related methods when onReject is called if confirmation is not of type signature', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockCancelQRScanRequestIfPresent = jest
      .fn()
      .mockResolvedValue(undefined);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: mockCancelQRScanRequestIfPresent,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onReject();
    expect(mockCancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockCaptureSignatureMetrics).not.toHaveBeenCalled();
    expect(clearSecurityAlertResponseSpy).not.toHaveBeenCalled();
  });

  it('call required callbacks when reject button is clicked', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockCancelQRScanRequestIfPresent = jest
      .fn()
      .mockResolvedValue(undefined);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      cancelQRScanRequestIfPresent: mockCancelQRScanRequestIfPresent,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onReject();
    expect(mockCancelQRScanRequestIfPresent).toHaveBeenCalledTimes(1);
    await flushPromises();
    expect(Engine.rejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockCaptureSignatureMetrics).toHaveBeenCalledTimes(1);
    expect(clearSecurityAlertResponseSpy).toHaveBeenCalledTimes(1);
  });

  it('does not navigate back when onReject is called with skipNavigation as true', async () => {
    const goBackSpy = jest.fn();
    useNavigationMock.mockReturnValue({
      goBack: goBackSpy,
    } as unknown as ReturnType<typeof useNavigation>);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onReject(undefined, true);
    expect(goBackSpy).not.toHaveBeenCalled();
  });

  it('sets waitForResult to false when approvalType is TransactionBatch', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({ openLedgerSignModal: mockOpenLedgerSignModal });

    const transactionBatchState = {
      engine: {
        backgroundState: {
          ...stakingDepositConfirmationState.engine.backgroundState,
          ApprovalController: {
            pendingApprovals: {
              'batch-approval-id': {
                id: 'batch-approval-id',
                origin: 'metamask',
                type: 'transaction_batch',
                time: 1738825814816,
                requestData: { batchId: '0x123456789abcdef' },
                requestState: null,
                expectsResult: false,
              },
            },
            pendingApprovalCount: 1,
            approvalFlows: [],
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: transactionBatchState,
    });

    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    const callArgs = (Engine.acceptPendingApproval as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe('batch-approval-id');
    expect(callArgs[2]).toEqual({
      waitForResult: false,
      deleteAfterResult: true,
      handleErrors: false,
    });
    await flushPromises();
  });

  it('sets waitForResult to true when approvalType is not TransactionBatch', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({ openLedgerSignModal: mockOpenLedgerSignModal });

    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });

    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    const callArgs = (Engine.acceptPendingApproval as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe('76b33b40-7b5c-11ef-bc0a-25bce29dbc09');
    expect(callArgs[2]).toEqual({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
    await flushPromises();
  });

  it('navigates to transactions view when confirming batch transaction', async () => {
    const mockOpenLedgerSignModal = jest.fn();
    createUseLedgerContextSpy({ openLedgerSignModal: mockOpenLedgerSignModal });

    const lendingBatchId = 'lending-batch-id';
    const lendingDepositBatchState = {
      engine: {
        backgroundState: {
          ...stakingDepositConfirmationState.engine.backgroundState,
          ApprovalController: {
            pendingApprovals: {
              [lendingBatchId]: {
                id: lendingBatchId,
                origin: 'metamask',
                type: 'transaction_batch',
                time: 1738825814816,
                requestData: {},
                requestState: null,
                expectsResult: false,
              },
            },
            pendingApprovalCount: 1,
            approvalFlows: [],
          },
          TransactionController: {
            transactions: [],
            transactionBatches: [
              {
                id: lendingBatchId,
                chainId: '0x1' as `0x${string}`,
                origin: 'metamask',
                from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
                transactions: [
                  { type: TransactionType.contractInteraction },
                  { type: TransactionType.lendingDeposit },
                ],
              },
            ],
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: lendingDepositBatchState,
    });

    result?.current?.onConfirm();
    await flushPromises();

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('TransactionsView');
  });
});
