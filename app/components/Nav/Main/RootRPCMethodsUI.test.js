import React from 'react';
import { Alert } from 'react-native';
import { render } from '@testing-library/react-native';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import { MetaMetricsEvents } from '../../../core/Analytics';
// Resolves to the mock from jest.mock below, not the real Engine
import Engine, { controllerMessenger } from '../../../core/Engine';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import Logger from '../../../util/Logger';
import { STX_NO_HASH_ERROR } from '../../../util/smart-transactions/smart-publish-hook';
import { HardwareWalletsSwapsStatus } from '../../UI/Bridge/Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

let capturedAutoSign;
const SOFTWARE_ADDRESS = '0x1111111111111111111111111111111111111111';
const LEDGER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const QR_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const mockDispatch = jest.fn();
let mockBridgeState = {
  hardwareWalletsSwaps: {
    status: HardwareWalletsSwapsStatus.Idle,
    currentStep: 0,
    totalSteps: 0,
    steps: [],
  },
};

jest.mock('./onUnapprovedTransaction', () => ({
  onUnapprovedTransaction: jest.fn((_, { autoSign }) => {
    capturedAutoSign = autoSign;
  }),
}));

jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  rejectPendingApproval: jest.fn(),
  context: {
    TokensController: { hub: { removeAllListeners: jest.fn() } },
    ApprovalController: {
      acceptRequest: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector) => selector({ bridge: mockBridgeState }),
}));

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ event: 'built' }));
const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockExecuteHardwareWalletOperation = jest.fn();
const mockEnsureDeviceReady = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();

jest.mock('../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  executeHardwareWalletOperation: (...args) =>
    mockExecuteHardwareWalletOperation(...args),
}));

const mockGetHardwareWalletTypeForAddress = jest.fn();
const mockGetDeviceIdForAddress = jest.fn();
jest.mock('../../../core/HardwareWallet/helpers', () => ({
  getDeviceIdForAddress: (...args) => mockGetDeviceIdForAddress(...args),
  getHardwareWalletTypeForAddress: (...args) =>
    mockGetHardwareWalletTypeForAddress(...args),
}));

jest.mock('../../Approvals/WatchAssetApproval', () => 'WatchAssetApproval');
jest.mock('../../Approvals/AddChainApproval', () => 'AddChainApproval');
jest.mock('../../Approvals/SwitchChainApproval', () => 'SwitchChainApproval');
jest.mock('../../Approvals/ConnectApproval', () => 'ConnectApproval');
jest.mock('../../Approvals/PermissionApproval', () => 'PermissionApproval');
jest.mock('../../Approvals/FlowLoaderModal', () => 'FlowLoaderModal');
jest.mock(
  '../../Approvals/TemplateConfirmationModal',
  () => 'TemplateConfirmationModal',
);
jest.mock('../../../components/Views/confirmations/components/confirm', () => ({
  ConfirmRoot: 'ConfirmRoot',
}));
jest.mock('../../Approvals/InstallSnapApproval', () => 'InstallSnapApproval');
jest.mock(
  '../../Snaps/SnapDialogApproval/SnapDialogApproval',
  () => 'SnapDialogApproval',
);
jest.mock(
  '../../Approvals/SnapAccountCustomNameApproval',
  () => 'SnapAccountCustomNameApproval',
);
jest.mock('../../UI/QRHardware/QRSigningTransactionModal', () => ({
  createQRSigningTransactionModalNavDetails: jest
    .fn()
    .mockImplementation((params) => ['QRSigningModal', params]),
}));

describe('RootRPCMethodsUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    capturedAutoSign = undefined;
    mockGetHardwareWalletTypeForAddress.mockReturnValue(
      HardwareWalletType.Ledger,
    );
    mockGetDeviceIdForAddress.mockResolvedValue('device-id');
    mockExecuteHardwareWalletOperation.mockResolvedValue(true);
    mockEnsureDeviceReady.mockResolvedValue(true);
    mockBridgeState = {
      hardwareWalletsSwaps: {
        status: HardwareWalletsSwapsStatus.Idle,
        currentStep: 0,
        totalSteps: 0,
        steps: [],
      },
    };
  });

  describe('autoSign', () => {
    it('does not navigate or open signing when from account is not Ledger or QR', async () => {
      mockGetHardwareWalletTypeForAddress.mockReturnValue(undefined);

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-1',
        txParams: { from: SOFTWARE_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-1',
        txParams: { from: SOFTWARE_ADDRESS },
      });

      expect(mockGetHardwareWalletTypeForAddress).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
    });

    it('uses the shared hardware wallet execution flow for Ledger auto-sign', async () => {
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({ execute }) => {
          await execute();
          return true;
        },
      );

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-ledger',
        txParams: { from: LEDGER_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-ledger',
        txParams: { from: LEDGER_ADDRESS },
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith({
        address: LEDGER_ADDRESS,
        operationType: 'transaction',
        ensureDeviceReady: expect.any(Function),
        setPendingOperationAddress: expect.any(Function),
        showAwaitingConfirmation: expect.any(Function),
        hideAwaitingConfirmation: expect.any(Function),
        showHardwareWalletError: expect.any(Function),
        onError: expect.any(Function),
        execute: expect.any(Function),
        onRejected: expect.any(Function),
      });

      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledWith('tx-ledger', undefined, {
        waitForResult: true,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('delegates to useHwBatchSignTracker during active Bridge progress', async () => {
      mockBridgeState = {
        hardwareWalletsSwaps: {
          status: HardwareWalletsSwapsStatus.Waiting,
          currentStep: 1,
          totalSteps: 2,
          steps: [],
        },
      };

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-ledger-progress',
        type: 'swapApproval',
        txParams: { from: LEDGER_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-ledger-progress',
        type: 'swapApproval',
        txParams: { from: LEDGER_ADDRESS },
      });

      // autoSign should return early — useHwBatchSignTracker handles
      // approval acceptance and state machine updates.
      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockShowAwaitingConfirmation).not.toHaveBeenCalled();
      expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).not.toHaveBeenCalled();
    });

    it('delegates to useHwBatchSignTracker while Bridge progress is reconnecting', async () => {
      mockBridgeState = {
        hardwareWalletsSwaps: {
          status: HardwareWalletsSwapsStatus.Disconnected,
          currentStep: 1,
          totalSteps: 1,
          steps: [],
        },
      };

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-ledger-reconnecting',
        type: 'swap',
        txParams: { from: LEDGER_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-ledger-reconnecting',
        type: 'swap',
        txParams: { from: LEDGER_ADDRESS },
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockShowAwaitingConfirmation).not.toHaveBeenCalled();
      expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).not.toHaveBeenCalled();
    });

    it('still routes QR auto-sign through the QR signing modal', async () => {
      mockGetHardwareWalletTypeForAddress.mockReturnValue(
        HardwareWalletType.Qr,
      );

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-qr',
        txParams: { from: QR_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-qr',
        txParams: { from: QR_ADDRESS },
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('advances active Bridge progress after QR confirmation completes', async () => {
      mockBridgeState = {
        hardwareWalletsSwaps: {
          status: HardwareWalletsSwapsStatus.Waiting,
          currentStep: 1,
          totalSteps: 2,
          steps: [],
        },
      };
      mockGetHardwareWalletTypeForAddress.mockReturnValue(
        HardwareWalletType.Qr,
      );
      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-qr-progress',
        type: 'swap',
        txParams: { from: QR_ADDRESS },
      });

      await capturedAutoSign({
        id: 'tx-qr-progress',
        type: 'swap',
        txParams: { from: QR_ADDRESS },
      });
      const qrParams = mockNavigate.mock.calls[0][1];
      qrParams.onConfirmationComplete(true);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ type: 'SIGNED' }),
        }),
      );
    });

    it('surfaces unexpected errors from hardware wallet type lookup', async () => {
      const error = new Error('Unable to read hardware wallet account');
      mockGetHardwareWalletTypeForAddress.mockImplementationOnce(() => {
        throw error;
      });

      render(<RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-lookup-error',
        txParams: { from: LEDGER_ADDRESS },
      });

      await expect(
        capturedAutoSign({
          id: 'tx-lookup-error',
          txParams: { from: LEDGER_ADDRESS },
        }),
      ).resolves.toBeUndefined();

      expect(Alert.alert).toHaveBeenCalledWith(
        'Transaction error',
        error.message,
        [{ text: 'OK' }],
      );
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to send transaction (Main)',
      );
      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
    });
  });

  it('tracks DAPP_TRANSACTION_CANCELLED when the shared hardware wallet flow handles a keystone cancel', async () => {
    mockExecuteHardwareWalletOperation.mockImplementationOnce(
      async ({ onError }) => {
        await onError?.(new Error('KeystoneError#Tx_canceled'));
        return false;
      },
    );

    render(<RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />);

    const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
    const handleUnapprovedTransaction = subscribeCall[1];

    handleUnapprovedTransaction({
      id: 'tx-1',
      txParams: { from: LEDGER_ADDRESS },
    });

    await capturedAutoSign({
      id: 'tx-1',
      txParams: { from: LEDGER_ADDRESS },
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
    );
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('tracks DAPP_TRANSACTION_CANCELLED when the shared hardware wallet flow handles an STX no-hash cancel', async () => {
    mockExecuteHardwareWalletOperation.mockImplementationOnce(
      async ({ onError }) => {
        await onError?.(new Error(STX_NO_HASH_ERROR));
        return false;
      },
    );

    render(<RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />);

    const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
    const handleUnapprovedTransaction = subscribeCall[1];

    handleUnapprovedTransaction({
      id: 'tx-stx',
      txParams: { from: LEDGER_ADDRESS },
    });

    await capturedAutoSign({
      id: 'tx-stx',
      txParams: { from: LEDGER_ADDRESS },
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('logs unexpected hardware wallet errors through the shared error callback', async () => {
    const error = new Error('Ledger signing failed');
    mockExecuteHardwareWalletOperation.mockImplementationOnce(
      async ({ onError }) => {
        await onError?.(error);
        return false;
      },
    );

    render(<RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />);

    const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
    const handleUnapprovedTransaction = subscribeCall[1];

    handleUnapprovedTransaction({
      id: 'tx-error',
      txParams: { from: LEDGER_ADDRESS },
    });

    await capturedAutoSign({
      id: 'tx-error',
      txParams: { from: LEDGER_ADDRESS },
    });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'error while trying to send transaction (Main)',
    );
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
