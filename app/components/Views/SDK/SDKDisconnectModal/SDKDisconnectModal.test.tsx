import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

let mockRouteParams: Record<string, unknown> | undefined = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
  useRoute: jest.fn(() => ({
    key: '1',
    name: 'params',
    params: mockRouteParams,
  })),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({ colors: {}, typography: {} })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn((value) => `0x${value}`),
}));

jest.mock('../../../../core/Permissions', () => ({
  removePermittedAccounts: jest.fn(),
}));

jest.mock('../../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: jest.fn(() => ({
    removeChannel: jest.fn(),
    removeAll: jest.fn(),
  })),
}));

jest.mock('../../../../core/SDKConnectV2', () => ({
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../constants/navigation/Routes', () => ({
  SETTINGS: {
    SDK_SESSIONS_MANAGER: 'SDK_SESSIONS_MANAGER',
  },
}));

const mockNavigate = jest.fn();
const mockRemoveChannel = jest.fn();
const mockRemoveAll = jest.fn();

// Import after mocking
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SDKDisconnectModal from './SDKDisconnectModal';
import { removePermittedAccounts } from '../../../../core/Permissions';
import SDKConnect from '../../../../core/SDKConnect/SDKConnect';
import SDKConnectV2 from '../../../../core/SDKConnectV2';

describe('SDKDisconnectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};

    (useSelector as jest.Mock).mockReturnValue({
      v2Connections: { conn1: {}, conn2: {} },
    });

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (SDKConnect.getInstance as jest.Mock).mockReturnValue({
      removeChannel: mockRemoveChannel,
      removeAll: mockRemoveAll,
    });
  });

  describe('Basic Rendering', () => {
    it('renders with account params', () => {
      mockRouteParams = {
        account: '0x123',
        accountName: 'Test Account',
        channelId: 'channel1',
        dapp: 'Test DApp',
      };
      const { getByText } = render(<SDKDisconnectModal />);

      expect(getByText('sdk_disconnect_modal.disconnect_account')).toBeTruthy();
      expect(getByText('sdk_disconnect_modal.disconnect_confirm')).toBeTruthy();
      expect(getByText('sdk_disconnect_modal.cancel')).toBeTruthy();
    });

    it('renders with channel params', () => {
      mockRouteParams = { channelId: 'channel1', dapp: 'Test DApp' };
      const { getByText } = render(<SDKDisconnectModal />);

      expect(
        getByText('sdk_disconnect_modal.disconnect_all_accounts'),
      ).toBeTruthy();
    });

    it('renders with no params', () => {
      mockRouteParams = {};
      const { getByText } = render(<SDKDisconnectModal />);

      expect(getByText('sdk_disconnect_modal.disconnect_all')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('handles disconnect single account', () => {
      mockRouteParams = {
        account: '0x123',
        channelId: 'channel1',
        accountsLength: 2,
      };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('handles disconnect channel', () => {
      mockRouteParams = { channelId: 'channel1' };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(mockRemoveChannel).toHaveBeenCalledWith({
        channelId: 'channel1',
        sendTerminate: true,
      });
    });

    it('handles disconnect all', () => {
      mockRouteParams = {};
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(mockRemoveAll).toHaveBeenCalled();
    });

    it('handles V2 disconnect', async () => {
      mockRouteParams = { channelId: 'channel1', isV2: true };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('channel1');
    });

    it('handles cancel', () => {
      mockRouteParams = { channelId: 'channel1' };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.cancel'));

      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER');
    });

    it('handles last account disconnect', () => {
      mockRouteParams = {
        account: '0x123',
        channelId: 'channel1',
        accountsLength: 1,
      };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(mockRemoveChannel).toHaveBeenCalledWith({
        channelId: 'channel1',
        sendTerminate: true,
      });
    });

    it('handles V2 disconnect all', async () => {
      mockRouteParams = { isV2: true };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      // The component iterates through v2Connections (conn1, conn2)
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('conn1');
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('conn2');
    });

    it('handles undefined params gracefully', () => {
      mockRouteParams = undefined;
      const { getByText } = render(<SDKDisconnectModal />);

      expect(getByText('sdk_disconnect_modal.disconnect_all')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles V2 disconnect errors gracefully', async () => {
      (SDKConnectV2.disconnect as jest.Mock).mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );
      mockRouteParams = { channelId: 'channel1', isV2: true };

      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER', {
        trigger: expect.any(Number),
      });
    });

    it('handles V2 account disconnect with last account escalation', async () => {
      mockRouteParams = {
        account: '0x123',
        channelId: 'channel1',
        accountsLength: 1,
        isV2: true,
      };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('channel1');
    });

    it('handles V2 account disconnect without escalation', async () => {
      mockRouteParams = {
        account: '0x123',
        channelId: 'channel1',
        accountsLength: 3,
        isV2: true,
      };
      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(SDKConnectV2.disconnect).not.toHaveBeenCalled();
    });

    it('handles empty v2Connections gracefully', async () => {
      (useSelector as jest.Mock).mockReturnValue({
        v2Connections: {},
      });
      mockRouteParams = { isV2: true };

      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(SDKConnectV2.disconnect).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('handles null v2Connections gracefully', async () => {
      (useSelector as jest.Mock).mockReturnValue({
        v2Connections: null,
      });
      mockRouteParams = { isV2: true };

      const { getByText } = render(<SDKDisconnectModal />);

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(SDKConnectV2.disconnect).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER', {
        trigger: expect.any(Number),
      });
    });
  });
});
