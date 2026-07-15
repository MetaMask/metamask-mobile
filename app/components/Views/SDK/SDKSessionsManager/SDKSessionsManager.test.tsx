import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
  useRoute: jest.fn(() => ({ params: {} })),
}));

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
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
const mockGoBack = jest.fn();

import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import SDKSessionsManager from './SDKSessionsManager';
import Routes from '../../../../constants/navigation/Routes';
import { SDKSelectorsIDs } from '../SDK.testIds';

describe('SDKSessionsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
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

      const { getByText } = render(<SDKSessionsManager />);

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

      const { getByTestId, getByText } = render(<SDKSessionsManager />);

      expect(getByTestId('sdk-session-conn1')).toBeTruthy();
      expect(getByTestId('sdk-session-dapp1')).toBeTruthy();
      expect(getByTestId('sdk-session-v2conn1')).toBeTruthy();
      expect(getByText('sdk.disconnect_all')).toBeTruthy();
    });

    it('renders HeaderStandard with title and back button', () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {},
        dappConnections: {},
        v2Connections: {},
      });

      const { getByTestId } = render(<SDKSessionsManager />);

      expect(getByTestId(SDKSelectorsIDs.SESSION_MANAGER_HEADER)).toBeTruthy();
      expect(
        getByTestId(SDKSelectorsIDs.SESSION_MANAGER_BACK_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('User Actions', () => {
    it('handles disconnect all button press', async () => {
      (useSelector as jest.Mock).mockReturnValue({
        connections: {
          conn1: { id: 'conn1', name: 'Connection 1' },
        },
        dappConnections: {},
        v2Connections: {},
      });

      const { getByText } = render(<SDKSessionsManager />);

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

      render(<SDKSessionsManager />);

      expect(SDKSessionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 123,
          connection: { id: 'conn1', name: 'Connection 1' },
        }),
        undefined,
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

      render(<SDKSessionsManager />);

      expect(SDKSessionItem).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: undefined,
        }),
        undefined,
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

      const { getByTestId } = render(<SDKSessionsManager />);

      // Verify some connections are rendered
      expect(getByTestId('sdk-session-conn1')).toBeTruthy();
      expect(getByTestId('sdk-session-dapp1')).toBeTruthy();
      expect(getByTestId('sdk-session-v2conn1')).toBeTruthy();
    });
  });
});
