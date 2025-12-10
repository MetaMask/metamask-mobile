import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import { useNetworkConnectionBanner } from '../../hooks/useNetworkConnectionBanner';
import NetworkConnectionBanner from './NetworkConnectionBanner';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../hooks/useNetworkConnectionBanner');

jest.mock('../../../util/theme', () => ({
  useAppTheme: jest.fn(() => ({
    colors: {
      background: {
        section: '#FFFFFF',
      },
      icon: {
        default: '#000000',
      },
      error: {
        muted: '#FFE5E5',
        default: '#FF0000',
      },
    },
    themeAppearance: 'light',
    typography: {},
    shadows: {},
    brandColors: {},
  })),
}));

// Necessary because we mock SVGs by default
jest.mock('@metamask/design-system-react-native', () => {
  const Icon = ({ size }: { size: string }) => {
    // We can't import this at the top because the mock gets hoisted before any imports.
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="icon">
        <Text testID="icon-size">{size}</Text>
      </View>
    );
  };

  return {
    __esModule: true,
    ...jest.requireActual('@metamask/design-system-react-native'),
    Icon,
  };
});

const useNetworkConnectionBannerMock = jest.mocked(useNetworkConnectionBanner);

describe('NetworkConnectionBanner', () => {
  const mockUpdateRpc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when banner is not visible', () => {
    it('should not render when visible is false', () => {
      useNetworkConnectionBannerMock.mockReturnValue({
        networkConnectionBannerState: { visible: false },
        updateRpc: mockUpdateRpc,
      });

      const { root } = renderWithProvider(<NetworkConnectionBanner />);

      expect(root).toBeUndefined();
    });
  });

  describe('when banner is visible', () => {
    const customNetworkStatusTestCases = [
      {
        status: 'degraded' as const,
        expectedMessage: 'Still connecting to Polygon Mainnet...',
        updateRpcButtonText: 'Update RPC',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to Polygon Mainnet.',
        updateRpcButtonText: 'update RPC',
      },
    ];

    const infuraNetworkStatusTestCases = [
      {
        status: 'degraded' as const,
        expectedMessage: 'Still connecting to Ethereum Mainnet...',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to Ethereum Mainnet.',
      },
    ];

    it.each(customNetworkStatusTestCases)(
      'should render the banner with correct structure for $status status with custom network',
      ({ status, expectedMessage, updateRpcButtonText }) => {
        useNetworkConnectionBannerMock.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x89',
            status,
            networkName: 'Polygon Mainnet',
            rpcUrl: 'https://polygon-rpc.com',
            isInfuraEndpoint: false,
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByTestId, getByText } = renderWithProvider(
          <NetworkConnectionBanner />,
        );

        expect(getByTestId('icon')).toBeTruthy();
        expect(getByText(expectedMessage)).toBeTruthy();
        expect(getByText(updateRpcButtonText)).toBeTruthy();
      },
    );

    it.each(infuraNetworkStatusTestCases)(
      'should render the banner with correct structure for $status status with Infura network',
      ({ status, expectedMessage }) => {
        useNetworkConnectionBannerMock.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
            isInfuraEndpoint: true,
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByTestId, getByText, queryByText } = renderWithProvider(
          <NetworkConnectionBanner />,
        );

        expect(getByTestId('icon')).toBeTruthy();
        expect(getByText(expectedMessage)).toBeTruthy();
        expect(queryByText('Update RPC')).toBeNull();
        expect(queryByText('update RPC')).toBeNull();
      },
    );

    it.each(customNetworkStatusTestCases)(
      'should call updateRpc when Update RPC button is pressed for $status status',
      ({ status, updateRpcButtonText }) => {
        useNetworkConnectionBannerMock.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x89',
            status,
            networkName: 'Polygon Mainnet',
            rpcUrl: 'https://polygon-rpc.com',
            isInfuraEndpoint: false,
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = renderWithProvider(<NetworkConnectionBanner />);

        const updateButton = getByText(updateRpcButtonText);
        fireEvent.press(updateButton);

        expect(mockUpdateRpc).toHaveBeenCalledWith(
          'https://polygon-rpc.com',
          status,
          '0x89',
        );
      },
    );
  });

  describe('edge cases', () => {
    const emptyNameTestCases = [
      {
        status: 'degraded' as const,
        expectedMessage: 'Still connecting to ...',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to .',
      },
    ];

    it.each(emptyNameTestCases)(
      'should handle network with empty name for $status status',
      ({ status, expectedMessage }) => {
        useNetworkConnectionBannerMock.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: '',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
            isInfuraEndpoint: true,
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = renderWithProvider(<NetworkConnectionBanner />);

        expect(getByText(expectedMessage)).toBeTruthy();
      },
    );

    it('should handle multiple rapid button presses', () => {
      useNetworkConnectionBannerMock.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x89',
          status: 'degraded',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
          isInfuraEndpoint: false,
        },
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = renderWithProvider(<NetworkConnectionBanner />);

      const updateButton = getByText('Update RPC');

      // Press button multiple times rapidly
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);

      expect(mockUpdateRpc).toHaveBeenCalledTimes(3);
      expect(mockUpdateRpc).toHaveBeenCalledWith(
        'https://polygon-rpc.com',
        'degraded',
        '0x89',
      );
    });
  });
});
