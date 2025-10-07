import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 375, height: 812 })),
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
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              account: '123',
              accountName: 'Test Account',
              channelId: 'channel1',
              dapp: 'Test DApp',
            },
          }}
        />,
      );

      expect(getByText('sdk_disconnect_modal.disconnect_account')).toBeTruthy();
      expect(getByText('sdk_disconnect_modal.disconnect_confirm')).toBeTruthy();
      expect(getByText('sdk_disconnect_modal.cancel')).toBeTruthy();
    });

    it('renders with channel params', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              channelId: 'channel1',
              dapp: 'Test DApp',
            },
          }}
        />,
      );

      expect(
        getByText('sdk_disconnect_modal.disconnect_all_accounts'),
      ).toBeTruthy();
    });

    it('renders with no params', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {},
          }}
        />,
      );

      expect(getByText('sdk_disconnect_modal.disconnect_all')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('handles disconnect single account', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              account: '123',
              channelId: 'channel1',
              accountsLength: 2,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('handles disconnect channel', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              channelId: 'channel1',
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(mockRemoveChannel).toHaveBeenCalledWith({
        channelId: 'channel1',
        sendTerminate: true,
      });
    });

    it('handles disconnect all', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {},
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(mockRemoveAll).toHaveBeenCalled();
    });

    it('handles V2 disconnect', async () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              channelId: 'channel1',
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('channel1');
    });

    it('handles cancel', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              channelId: 'channel1',
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.cancel'));

      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER');
    });

    it('handles last account disconnect', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              account: '123',
              channelId: 'channel1',
              accountsLength: 1,
            },
          }}
        />,
      );

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
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      // The component iterates through v2Connections (conn1, conn2)
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('conn1');
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('conn2');
    });

    it('handles undefined params gracefully', () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            params: undefined as any,
          }}
        />,
      );

      expect(getByText('sdk_disconnect_modal.disconnect_all')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles V2 disconnect errors gracefully', async () => {
      // Mock SDKConnectV2.disconnect to throw an error
      (SDKConnectV2.disconnect as jest.Mock).mockRejectedValueOnce(
        new Error('Disconnect failed'),
      );

      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              channelId: 'channel1',
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should still navigate even on error
      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER', {
        trigger: expect.any(Number),
      });
    });

    it('handles V2 account disconnect with last account escalation', async () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              account: '123',
              channelId: 'channel1',
              accountsLength: 1,
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(removePermittedAccounts).toHaveBeenCalledWith('channel1', [
        '0x123',
      ]);
      expect(SDKConnectV2.disconnect).toHaveBeenCalledWith('channel1');
    });

    it('handles V2 account disconnect without escalation', async () => {
      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              account: '123',
              channelId: 'channel1',
              accountsLength: 3, // More than 1 account
              isV2: true,
            },
          }}
        />,
      );

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

      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(SDKConnectV2.disconnect).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('handles null v2Connections gracefully', async () => {
      (useSelector as jest.Mock).mockReturnValue({
        v2Connections: null,
      });

      const { getByText } = render(
        <SDKDisconnectModal
          route={{
            params: {
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk_disconnect_modal.disconnect_confirm'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(SDKConnectV2.disconnect).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('SDK_SESSIONS_MANAGER', {
        trigger: expect.any(Number),
      });
    });
  });
});
