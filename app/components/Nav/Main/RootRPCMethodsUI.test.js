import React from 'react';
import { render } from '@testing-library/react-native';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import { MetaMetricsEvents } from '../../../core/Analytics';
// Resolves to the mock from jest.mock below, not the real Engine
import Engine, { controllerMessenger } from '../../../core/Engine';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

let capturedAutoSign;
const SOFTWARE_ADDRESS = '0x1111111111111111111111111111111111111111';
const LEDGER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const QR_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

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

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ event: 'built' }));
const mockCreateEventBuilder = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
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
  executeHardwareWalletOperation: (...args) =>
    mockExecuteHardwareWalletOperation(...args),
}));

const mockGetHardwareWalletTypeForAddress = jest.fn();
jest.mock('../../../core/HardwareWallet/helpers', () => ({
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
    .mockReturnValue(['QRSigningModal', {}]),
}));

describe('RootRPCMethodsUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAutoSign = undefined;
    mockGetHardwareWalletTypeForAddress.mockReturnValue(
      HardwareWalletType.Ledger,
    );
    mockExecuteHardwareWalletOperation.mockResolvedValue(true);
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
        setTargetWalletType: expect.any(Function),
        showAwaitingConfirmation: expect.any(Function),
        hideAwaitingConfirmation: expect.any(Function),
        showHardwareWalletError: expect.any(Function),
        onError: expect.any(Function),
        execute: expect.any(Function),
        onRejected: expect.any(Function),
      });

      const executeArg =
        mockExecuteHardwareWalletOperation.mock.calls[0][0].execute;
      await executeArg();

      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledWith('tx-ledger', undefined, {
        waitForResult: true,
      });
      expect(mockNavigate).not.toHaveBeenCalled();
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
});
