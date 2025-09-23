import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

import NetworkConnectionBanner from './NetworkConnectionBanner';
import { useNetworkConnectionBanners } from '../../hooks/useNetworkConnectionBanners';

jest.mock('../../hooks/useNetworkConnectionBanners');

jest.mock('../AnimatedSpinner', () => ({
  __esModule: true,
  default: ({ size }: { size: Record<string, string> }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="animated-spinner">
        <Text testID="spinner-size">{size}</Text>
      </View>
    );
  },
  SpinnerSize: {
    SM: 'SM',
  },
}));

const mockUseNetworkConnectionBanners =
  useNetworkConnectionBanners as jest.MockedFunction<
    typeof useNetworkConnectionBanners
  >;

const mockNetworkConfiguration: NetworkConfiguration = {
  chainId: '0x1',
  name: 'Ethereum Mainnet',
  rpcEndpoints: [
    {
      url: 'https://mainnet.infura.io/v3/test',
      networkClientId: '0x1',
      type: RpcEndpointType.Custom,
    },
  ],
  defaultRpcEndpointIndex: 0,
  blockExplorerUrls: ['https://etherscan.io'],
  nativeCurrency: 'ETH',
};

describe('NetworkConnectionBanner', () => {
  const mockUpdateRpc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('snapshots', () => {
    it('should match snapshot when banner is not visible', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: { visible: false },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      const { toJSON } = render(<NetworkConnectionBanner />);

      expect(toJSON()).toMatchSnapshot();
    });

    const statusSnapshotTestCases = [
      {
        status: 'slow' as const,
        name: 'for slow status banner',
      },
      {
        status: 'unavailable' as const,
        name: 'for unavailable status banner',
      },
    ];

    it.each(statusSnapshotTestCases)(
      'should match snapshot $name',
      ({ status }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { toJSON } = render(<NetworkConnectionBanner />);

        expect(toJSON()).toMatchSnapshot();
      },
    );

    it('should match snapshot for different network', () => {
      const polygonNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        chainId: '0x89',
        name: 'Polygon Mainnet',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
        },
        currentNetwork: polygonNetwork,
        updateRpc: mockUpdateRpc,
      });

      const { toJSON } = render(<NetworkConnectionBanner />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('when banner is not visible', () => {
    it('should not render when visible is false', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: { visible: false },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      const { queryByTestId } = render(<NetworkConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });

    it('should not render when currentNetwork is undefined', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: undefined,
        updateRpc: mockUpdateRpc,
      });

      const { queryByTestId } = render(<NetworkConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });

    it('should not render when both visible is false and currentNetwork is undefined', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: { visible: false },
        currentNetwork: undefined,
        updateRpc: mockUpdateRpc,
      });

      const { queryByTestId } = render(<NetworkConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });
  });

  describe('when banner is visible', () => {
    const statusTestCases = [
      {
        status: 'slow' as const,
        expectedMessage: 'Still connecting to Ethereum Mainnet...',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to Ethereum Mainnet.',
      },
    ];

    it.each(statusTestCases)(
      'should render the banner with correct structure for $status status',
      ({ status, expectedMessage }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByTestId, getByText } = render(<NetworkConnectionBanner />);

        expect(getByTestId('animated-spinner')).toBeTruthy();
        expect(getByText(expectedMessage)).toBeTruthy();
        expect(getByText('Update RPC')).toBeTruthy();
      },
    );

    it.each(statusTestCases)(
      'should display spinner with correct size for $status status',
      ({ status }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByTestId } = render(<NetworkConnectionBanner />);

        const spinner = getByTestId('animated-spinner');
        const sizeText = getByTestId('spinner-size');

        expect(spinner).toBeTruthy();
        expect(sizeText).toBeTruthy();
        expect(sizeText.props.children).toBe('SM');
      },
    );

    it.each(statusTestCases)(
      'should display network name in the message for $status status',
      ({ status, expectedMessage }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        expect(getByText(expectedMessage)).toBeTruthy();
      },
    );

    it.each(statusTestCases)(
      'should call updateRpc when Update RPC button is pressed for $status status',
      ({ status }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        const updateButton = getByText('Update RPC');
        fireEvent.press(updateButton);

        expect(mockUpdateRpc).toHaveBeenCalledTimes(1);
      },
    );

    it.each(statusTestCases)(
      'should render button with correct variant and properties for $status status',
      ({ status }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        const updateButton = getByText('Update RPC');
        expect(updateButton).toBeTruthy();
      },
    );

    describe('status transitions', () => {
      it('should update message when status changes from slow to unavailable', () => {
        // Start with slow status
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status: 'slow',
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { rerender, getByText } = render(<NetworkConnectionBanner />);

        expect(
          getByText('Still connecting to Ethereum Mainnet...'),
        ).toBeTruthy();

        // Change to unavailable status
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status: 'unavailable',
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        rerender(<NetworkConnectionBanner />);

        expect(
          getByText('Unable to connect to Ethereum Mainnet.'),
        ).toBeTruthy();
      });

      it('should update message when status changes from unavailable to slow', () => {
        // Start with unavailable status
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status: 'unavailable',
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { rerender, getByText } = render(<NetworkConnectionBanner />);

        expect(
          getByText('Unable to connect to Ethereum Mainnet.'),
        ).toBeTruthy();

        // Change to slow status
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status: 'slow',
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        rerender(<NetworkConnectionBanner />);

        expect(
          getByText('Still connecting to Ethereum Mainnet...'),
        ).toBeTruthy();
      });
    });
  });

  describe('with different network configurations', () => {
    it('should display different network names correctly', () => {
      const polygonNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        chainId: '0x89',
        name: 'Polygon Mainnet',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
        },
        currentNetwork: polygonNetwork,
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet...')).toBeTruthy();
    });

    it('should handle network with special characters in name', () => {
      const specialNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: 'Test-Network (Beta)',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: specialNetwork,
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      expect(
        getByText('Still connecting to Test-Network (Beta)...'),
      ).toBeTruthy();
    });

    it('should handle network with very long name', () => {
      const longNameNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: 'Very Long Network Name That Might Cause Layout Issues',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: longNameNetwork,
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      expect(
        getByText(
          'Still connecting to Very Long Network Name That Might Cause Layout Issues...',
        ),
      ).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    const accessibilityTestCases = [
      {
        status: 'slow' as const,
        expectedMessage: 'Still connecting to Ethereum Mainnet...',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to Ethereum Mainnet.',
      },
    ];

    it.each(accessibilityTestCases)(
      'should render with proper accessibility structure for $status status',
      ({ status, expectedMessage }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        // The banner should be accessible with proper text content
        expect(getByText(expectedMessage)).toBeTruthy();
        expect(getByText('Update RPC')).toBeTruthy();
      },
    );

    it.each(accessibilityTestCases)(
      'should have accessible button for updating RPC for $status status',
      ({ status }) => {
        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: mockNetworkConfiguration,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        const updateButton = getByText('Update RPC');
        expect(updateButton).toBeTruthy();

        // Test that button is pressable
        fireEvent.press(updateButton);
        expect(mockUpdateRpc).toHaveBeenCalled();
      },
    );
  });

  describe('edge cases', () => {
    const emptyNameTestCases = [
      {
        status: 'slow' as const,
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
        const networkWithEmptyName: NetworkConfiguration = {
          ...mockNetworkConfiguration,
          name: '',
        };

        mockUseNetworkConnectionBanners.mockReturnValue({
          networkConnectionBannersState: {
            visible: true,
            chainId: '0x1',
            status,
          },
          currentNetwork: networkWithEmptyName,
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        expect(getByText(expectedMessage)).toBeTruthy();
      },
    );

    it('should handle multiple rapid button presses', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      const updateButton = getByText('Update RPC');

      // Press button multiple times rapidly
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);

      expect(mockUpdateRpc).toHaveBeenCalledTimes(3);
    });
  });

  describe('component lifecycle', () => {
    it('should update when hook values change', () => {
      // Initially not visible
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: { visible: false },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      const { rerender, queryByTestId, getByTestId } = render(
        <NetworkConnectionBanner />,
      );

      expect(queryByTestId('animated-spinner')).toBeNull();

      // Make it visible
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      rerender(<NetworkConnectionBanner />);

      expect(getByTestId('animated-spinner')).toBeTruthy();
    });

    it('should handle hook returning different network', () => {
      // Initially Ethereum
      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
        },
        currentNetwork: mockNetworkConfiguration,
        updateRpc: mockUpdateRpc,
      });

      const { rerender, getByText } = render(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Ethereum Mainnet...')).toBeTruthy();

      // Switch to Polygon
      const polygonNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        chainId: '0x89',
        name: 'Polygon Mainnet',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        networkConnectionBannersState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
        },
        currentNetwork: polygonNetwork,
        updateRpc: mockUpdateRpc,
      });

      rerender(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet...')).toBeTruthy();
    });
  });
});
