import React from 'react';
import { render } from '@testing-library/react-native';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import { MetaMetricsEvents } from '../../../core/Analytics';
// Resolves to the mock from jest.mock below, not the real Engine
import { controllerMessenger } from '../../../core/Engine';

let capturedAutoSign;

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
  context: {
    TokensController: { hub: { removeAllListeners: jest.fn() } },
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

const mockIsHardwareAccount = jest.fn((_, types) =>
  types.includes('Ledger Hardware'),
);
jest.mock('../../../util/address', () => ({
  isHardwareAccount: (...args) => mockIsHardwareAccount(...args),
}));

const mockGetDeviceId = jest.fn(() => {
  throw new Error('KeystoneError#Tx_canceled');
});
jest.mock('../../../core/Ledger/Ledger', () => ({
  getDeviceId: (...args) => mockGetDeviceId(...args),
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

describe('RootRPCMethodsUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAutoSign = undefined;
    mockIsHardwareAccount.mockImplementation((_, types) =>
      types.includes('Ledger Hardware'),
    );
  });

  describe('autoSign', () => {
    it('does not navigate or open signing when from account is not Ledger or QR', async () => {
      mockIsHardwareAccount.mockReturnValue(false);

      const mockNavigate = jest.fn();
      render(<RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />);

      const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
      const handleUnapprovedTransaction = subscribeCall[1];
      handleUnapprovedTransaction({
        id: 'tx-1',
        txParams: { from: '0xSoftwareWalletAddress' },
      });

      await capturedAutoSign({
        id: 'tx-1',
        txParams: { from: '0xSoftwareWalletAddress' },
      });

      expect(mockIsHardwareAccount).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetDeviceId).not.toHaveBeenCalled();
    });
  });

  it('calls trackEvent for DAPP_TRANSACTION_CANCELLED on keystone cancel', async () => {
    render(<RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />);

    const subscribeCall = controllerMessenger.subscribe.mock.calls[0];
    const handleUnapprovedTransaction = subscribeCall[1];

    handleUnapprovedTransaction({
      id: 'tx-1',
      txParams: { from: '0xLedgerAddress' },
    });

    await capturedAutoSign({
      id: 'tx-1',
      txParams: { from: '0xLedgerAddress' },
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
    );
    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
