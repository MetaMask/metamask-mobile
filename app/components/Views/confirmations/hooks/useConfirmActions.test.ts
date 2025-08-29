import { useNavigation } from '@react-navigation/native';

import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
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
// eslint-disable-next-line import/no-namespace
import * as SmartTransactionsSelector from '../../../../selectors/smartTransactionsController';
// eslint-disable-next-line import/no-namespace
import * as TransactionActions from '../../../../actions/transaction';
import { useConfirmActions } from './useConfirmActions';
import { cloneDeep } from 'lodash';
import { RootState } from '../../../../reducers';
import { ConfirmationMetricsState } from '../../../../core/redux/slices/confirmationMetrics';

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

const mockCaptureSignatureMetrics = jest.fn();
jest.mock('./signatures/useSignatureMetrics', () => ({
  useSignatureMetrics: () => ({
    captureSignatureMetrics: mockCaptureSignatureMetrics,
  }),
}));

const TRANSACTION_ID_MOCK = '699ca2f0-e459-11ef-b6f6-d182277cf5e1';

const flushPromises = async () => await new Promise(process.nextTick);

const createUseLedgerContextSpy = (mockedValues = {}) => {
  jest.spyOn(LedgerContext, 'useLedgerContext').mockReturnValue({
    ledgerSigningInProgress: false,
    openLedgerSignModal: jest.fn(),
    ...mockedValues,
  } as unknown as LedgerContext.LedgerContextType);
};

describe('useConfirmAction', () => {
  const useNavigationMock = jest.mocked(useNavigation);
  const navigateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationMock.mockReturnValue({
      goBack: jest.fn(),
      navigate: navigateMock,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('call setScannerVisible if QR signing is in progress', async () => {
    const clearSecurityAlertResponseSpy = jest.spyOn(
      PPOMUtil,
      'clearSignatureSecurityAlertResponse',
    );
    const mockSetScannerVisible = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isQRSigningInProgress: true,
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
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
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

  it('call acceptPendingApproval with parameters waitForResult as true for signatures even if smart transactions are enabled', async () => {
    jest
      .spyOn(SmartTransactionsSelector, 'selectShouldUseSmartTransaction')
      .mockReturnValue(true);
    const personalSignId = '76b33b40-7b5c-11ef-bc0a-25bce29dbc09';
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: personalSignatureConfirmationState,
    });
    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
      personalSignId,
      personalSignatureConfirmationState.engine.backgroundState
        .ApprovalController.pendingApprovals[personalSignId].requestData,
      { deleteAfterResult: true, handleErrors: false, waitForResult: true },
    );
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

  it('navigates to transactions view if confirmation is standalone confirmation', async () => {
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onConfirm();
    await flushPromises();

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('reset transaction state if confirmation is transaction', async () => {
    const resetTransactionSpy = jest.spyOn(
      TransactionActions,
      'resetTransaction',
    );
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onConfirm();
    await flushPromises();

    expect(resetTransactionSpy).toHaveBeenCalledTimes(1);
  });

  it('call acceptPendingApproval with parameters waitForResult as false for transactions if smart transactions are enabled', async () => {
    jest
      .spyOn(SmartTransactionsSelector, 'selectShouldUseSmartTransaction')
      .mockReturnValue(true);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      stakingDepositConfirmationState.engine.backgroundState.ApprovalController
        .pendingApprovals[TRANSACTION_ID_MOCK].requestData,
      { deleteAfterResult: true, handleErrors: false, waitForResult: false },
    );
  });

  it('call acceptPendingApproval with parameters waitForResult as true for transactions if smart transactions are not enabled', async () => {
    jest
      .spyOn(SmartTransactionsSelector, 'selectShouldUseSmartTransaction')
      .mockReturnValue(false);
    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state: stakingDepositConfirmationState,
    });
    result?.current?.onConfirm();
    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      stakingDepositConfirmationState.engine.backgroundState.ApprovalController
        .pendingApprovals[TRANSACTION_ID_MOCK].requestData,
      { deleteAfterResult: true, handleErrors: false, waitForResult: true },
    );
  });

  it('does not wait for result if bridge quotes', async () => {
    const state = cloneDeep(
      stakingDepositConfirmationState,
    ) as unknown as RootState;

    state.confirmationMetrics = {
      transactionBridgeQuotesById: {
        [TRANSACTION_ID_MOCK]: [{}],
      },
    } as unknown as ConfirmationMetricsState;

    const { result } = renderHookWithProvider(() => useConfirmActions(), {
      state,
    });

    result?.current?.onConfirm();

    expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      expect.any(Object),
      expect.objectContaining({ waitForResult: false }),
    );
  });
});
