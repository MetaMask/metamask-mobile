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
  useTheme: jest.fn(() => ({
    colors: { background: { default: '#FFF' } },
    typography: {},
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../core/Permissions', () => ({
  getPermittedAccounts: jest.fn(),
  getPermittedCaipAccountIdsByHostname: jest.fn(),
}));

jest.mock('../../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(),
}));

jest.mock('../../../../selectors/snaps/permissionController', () => ({
  selectPermissionControllerState: jest.fn(() => ({})),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'ROOT_MODAL_FLOW',
  },
  SHEET: {
    SDK_DISCONNECT: 'SDK_DISCONNECT',
  },
}));

jest.mock('../../../../util/address', () => ({
  toFormattedAddress: jest.fn((address) => address?.toLowerCase() || ''),
}));

const mockNavigate = jest.fn();

// Import after mocking
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getPermittedAccounts } from '../../../../core/Permissions';
import { useAccounts } from '../../../hooks/useAccounts';
import SDKSessionModal from './SDKSessionModal';
import Routes from '../../../../constants/navigation/Routes';

describe('SDKSessionModal', () => {
  const mockAccounts = [
    { address: '0x1234', name: 'Account 1' },
    { address: '0x5678', name: 'Account 2' },
    { address: '0xabcd', name: 'Account 3' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useSelector as jest.Mock).mockReturnValue({});

    (useAccounts as jest.Mock).mockReturnValue({
      evmAccounts: mockAccounts,
    });
  });

  describe('Component Rendering', () => {
    it('renders with basic params', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue([]);

      const { getByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(getByText('sdk.manage_connections')).toBeTruthy();
      expect(getByText('Test DApp')).toBeTruthy();
      expect(getByText('sdk.disconnect_all_accounts')).toBeTruthy();
    });

    it('renders SDK version info when provided', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue([]);

      const { getByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
              version: '1.0.0',
              platform: 'iOS',
            },
          }}
        />,
      );

      expect(getByText('SDK iOS v1.0.0')).toBeTruthy();
    });

    it('renders permitted accounts', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue(['0x1234', '0x5678']);

      const { getByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(getByText('Account 1')).toBeTruthy();
      expect(getByText('0x1234')).toBeTruthy();
      expect(getByText('Account 2')).toBeTruthy();
      expect(getByText('0x5678')).toBeTruthy();
    });
  });

  describe('User Actions', () => {
    it('handles disconnect all accounts', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue(['0x1234']);

      const { getByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
              isV2: true,
            },
          }}
        />,
      );

      fireEvent.press(getByText('sdk.disconnect_all_accounts'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_DISCONNECT,
        params: {
          channelId: 'channel1',
          account: undefined,
          accountsLength: 1,
          dapp: 'Test DApp',
          isV2: true,
        },
      });
    });

    it('handles disconnect individual account', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue(['0x1234', '0x5678']);

      const { getAllByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      const disconnectButtons = getAllByText('sdk.disconnect');
      fireEvent.press(disconnectButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_DISCONNECT,
        params: {
          channelId: 'channel1',
          accountsLength: 2,
          account: '0x1234',
          accountName: 'Account 1',
          dapp: 'Test DApp',
          isV2: undefined,
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles no permitted accounts', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue([]);

      const { queryByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(queryByText('Account 1')).toBeNull();
      expect(queryByText('sdk.disconnect_all_accounts')).toBeTruthy();
    });

    it('handles accounts with uppercase addresses', () => {
      (getPermittedAccounts as jest.Mock).mockReturnValue(['0xABCD']);

      const { getByText } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(getByText('Account 3')).toBeTruthy();
      expect(getByText('0xabcd')).toBeTruthy();
    });

    it('updates permitted accounts when channelId changes', () => {
      const { rerender } = render(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel1',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(getPermittedAccounts).toHaveBeenCalledWith('channel1');

      rerender(
        <SDKSessionModal
          route={{
            params: {
              channelId: 'channel2',
              urlOrTitle: 'Test DApp',
            },
          }}
        />,
      );

      expect(getPermittedAccounts).toHaveBeenCalledWith('channel2');
    });
  });
});
