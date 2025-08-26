import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
  useRoute: jest.fn(() => ({ params: {} })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
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

jest.mock('../../../UI/Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({})),
}));

jest.mock('../../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'ROOT_MODAL_FLOW',
  },
  SHEET: {
    SDK_DISCONNECT: 'SDK_DISCONNECT',
  },
}));

jest.mock('./SDKSessionItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ connection }) => (
      <View testID={`sdk-session-${connection.id}`}>
        <Text>{connection.id}</Text>
      </View>
    )),
  };
});

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import SDKSessionsManager from './SDKSessionsManager';
import Routes from '../../../../constants/navigation/Routes';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

describe('SDKSessionsManager', () => {
  const mockNavigation = {
    setOptions: mockSetOptions,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useRoute as jest.Mock).mockReturnValue({
      params: { trigger: 123 },
    });
  });

  describe('Component Rendering', () => {
    it('renders empty state when no connections', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {},
        dappConnections: {},
        v2Connections: {},
      });

      const { getByText } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SDKSessionsManager navigation={mockNavigation as any} />,
      );

      expect(getByText('sdk.no_connections')).toBeTruthy();
      expect(getByText('sdk.no_connections_desc')).toBeTruthy();
    });

    it('renders connections list when connections exist', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1', name: 'Connection 1' },
        },
        dappConnections: {
          dapp1: { id: 'dapp1', name: 'DApp 1' },
        },
        v2Connections: {
          v2conn1: { id: 'v2conn1', name: 'V2 Connection 1' },
        },
      });

      const { getByTestId, getByText } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SDKSessionsManager navigation={mockNavigation as any} />,
      );

      expect(getByTestId('sdk-session-conn1')).toBeTruthy();
      expect(getByTestId('sdk-session-dapp1')).toBeTruthy();
      expect(getByTestId('sdk-session-v2conn1')).toBeTruthy();
      expect(getByText('sdk.disconnect_all')).toBeTruthy();
    });

    it('sets navigation options on mount', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {},
        dappConnections: {},
        v2Connections: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<SDKSessionsManager navigation={mockNavigation as any} />);

      expect(mockSetOptions).toHaveBeenCalled();
      expect(getNavigationOptionsTitle).toHaveBeenCalledWith(
        'app_settings.manage_sdk_connections_title',
        mockNavigation,
        false,
        expect.any(Object),
      );
    });
  });

  describe('User Actions', () => {
    it('handles disconnect all button press', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1', name: 'Connection 1' },
        },
        dappConnections: {},
        v2Connections: {},
      });

      const { getByText } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SDKSessionsManager navigation={mockNavigation as any} />,
      );

      const disconnectAllButton = getByText('sdk.disconnect_all');
      fireEvent.press(disconnectAllButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_DISCONNECT,
      });
    });

    it('passes trigger prop to SDKSessionItem components', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1', name: 'Connection 1' },
        },
        dappConnections: {},
        v2Connections: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const SDKSessionItem = require('./SDKSessionItem').default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<SDKSessionsManager navigation={mockNavigation as any} />);

      expect(SDKSessionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 123,
          connection: { id: 'conn1', name: 'Connection 1' },
        }),
        expect.any(Object),
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined route params', () => {
      (useRoute as jest.Mock).mockReturnValue({
        params: undefined,
      });

      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1', name: 'Connection 1' },
        },
        dappConnections: {},
        v2Connections: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const SDKSessionItem = require('./SDKSessionItem').default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<SDKSessionsManager navigation={mockNavigation as any} />);

      expect(SDKSessionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: undefined,
        }),
        expect.any(Object),
      );
    });

    it('handles multiple connections correctly', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1' },
          conn2: { id: 'conn2' },
        },
        dappConnections: {
          dapp1: { id: 'dapp1' },
          dapp2: { id: 'dapp2' },
        },
        v2Connections: {
          v2conn1: { id: 'v2conn1' },
          v2conn2: { id: 'v2conn2' },
        },
      });

      const { getByTestId } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SDKSessionsManager navigation={mockNavigation as any} />,
      );

      // Verify some connections are rendered
      expect(getByTestId('sdk-session-conn1')).toBeTruthy();
      expect(getByTestId('sdk-session-dapp1')).toBeTruthy();
      expect(getByTestId('sdk-session-v2conn1')).toBeTruthy();
    });
  });
});
