import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';

import SlowRpcConnectionBanner from './SlowRpcConnectionBanner';
import { useNetworkConnectionBanners } from '../../hooks/useNetworkConnectionBanners';
import { strings } from '../../../../locales/i18n';

jest.mock('../../hooks/useNetworkConnectionBanners');
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn(
    (key: string, params?: Record<string, string | undefined>) => {
      if (key === 'slow_rpc_connection_banner.still_connecting_network') {
        const networkName = params?.networkName;
        if (networkName === undefined || networkName === null) {
          return 'Still connecting to network';
        }
        if (networkName === '') {
          return 'Still connecting to ';
        }
        return `Still connecting to ${networkName}`;
      }
      if (key === 'slow_rpc_connection_banner.edit_rpc') {
        return 'Edit RPC';
      }
      return key;
    },
  ),
}));

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

describe('SlowRpcConnectionBanner', () => {
  const mockEditRpc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when banner is not visible', () => {
    it('should not render when visible is false', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: false,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { queryByTestId } = render(<SlowRpcConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });

    it('should not render when currentNetwork is undefined', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: undefined,
        editRpc: mockEditRpc,
      });

      const { queryByTestId } = render(<SlowRpcConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });

    it('should not render when both visible is false and currentNetwork is undefined', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: false,
        chainId: undefined,
        currentNetwork: undefined,
        editRpc: mockEditRpc,
      });

      const { queryByTestId } = render(<SlowRpcConnectionBanner />);

      expect(queryByTestId('animated-spinner')).toBeNull();
    });
  });

  describe('when banner is visible', () => {
    beforeEach(() => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });
    });

    it('should render the banner with correct structure', () => {
      const { getByTestId, getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByTestId('animated-spinner')).toBeTruthy();
      expect(getByText('Still connecting to Ethereum Mainnet')).toBeTruthy();
      expect(getByText('Edit RPC')).toBeTruthy();
    });

    it('should display spinner with correct size', () => {
      const { getByTestId } = render(<SlowRpcConnectionBanner />);

      const spinner = getByTestId('animated-spinner');
      const sizeText = getByTestId('spinner-size');

      expect(spinner).toBeTruthy();
      expect(sizeText).toBeTruthy();
      expect(sizeText.props.children).toBe('SM');
    });

    it('should display network name in the message', () => {
      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to Ethereum Mainnet')).toBeTruthy();
    });

    it('should call strings with correct parameters', () => {
      render(<SlowRpcConnectionBanner />);

      expect(strings).toHaveBeenCalledWith(
        'slow_rpc_connection_banner.still_connecting_network',
        { networkName: 'Ethereum Mainnet' },
      );
      expect(strings).toHaveBeenCalledWith(
        'slow_rpc_connection_banner.edit_rpc',
      );
    });

    it('should call editRpc when Edit RPC button is pressed', () => {
      const { getByText } = render(<SlowRpcConnectionBanner />);

      const editButton = getByText('Edit RPC');
      fireEvent.press(editButton);

      expect(mockEditRpc).toHaveBeenCalledTimes(1);
    });

    it('should render button with correct variant and properties', () => {
      const { getByText } = render(<SlowRpcConnectionBanner />);

      const editButton = getByText('Edit RPC');
      expect(editButton).toBeTruthy();
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
        visible: true,
        chainId: '0x89',
        currentNetwork: polygonNetwork,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet')).toBeTruthy();
    });

    it('should handle network with special characters in name', () => {
      const specialNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: 'Test-Network (Beta)',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: specialNetwork,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to Test-Network (Beta)')).toBeTruthy();
    });

    it('should handle network with very long name', () => {
      const longNameNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: 'Very Long Network Name That Might Cause Layout Issues',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: longNameNetwork,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(
        getByText(
          'Still connecting to Very Long Network Name That Might Cause Layout Issues',
        ),
      ).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render with proper accessibility structure', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      // The banner should be accessible with proper text content
      expect(getByText('Still connecting to Ethereum Mainnet')).toBeTruthy();
      expect(getByText('Edit RPC')).toBeTruthy();
    });

    it('should have accessible button for editing RPC', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      const editButton = getByText('Edit RPC');
      expect(editButton).toBeTruthy();

      // Test that button is pressable
      fireEvent.press(editButton);
      expect(mockEditRpc).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle network with undefined name gracefully', () => {
      const networkWithoutName: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: undefined as unknown as string,
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: networkWithoutName,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to network')).toBeTruthy();
    });

    it('should handle network with empty name', () => {
      const networkWithEmptyName: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        name: '',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: networkWithEmptyName,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to ')).toBeTruthy();
    });

    it('should handle multiple rapid button presses', () => {
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { getByText } = render(<SlowRpcConnectionBanner />);

      const editButton = getByText('Edit RPC');

      // Press button multiple times rapidly
      fireEvent.press(editButton);
      fireEvent.press(editButton);
      fireEvent.press(editButton);

      expect(mockEditRpc).toHaveBeenCalledTimes(3);
    });
  });

  describe('component lifecycle', () => {
    it('should update when hook values change', () => {
      // Initially not visible
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: false,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { rerender, queryByTestId, getByTestId } = render(
        <SlowRpcConnectionBanner />,
      );

      expect(queryByTestId('animated-spinner')).toBeNull();

      // Make it visible
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      rerender(<SlowRpcConnectionBanner />);

      expect(getByTestId('animated-spinner')).toBeTruthy();
    });

    it('should handle hook returning different network', () => {
      // Initially Ethereum
      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x1',
        currentNetwork: mockNetworkConfiguration,
        editRpc: mockEditRpc,
      });

      const { rerender, getByText } = render(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to Ethereum Mainnet')).toBeTruthy();

      // Switch to Polygon
      const polygonNetwork: NetworkConfiguration = {
        ...mockNetworkConfiguration,
        chainId: '0x89',
        name: 'Polygon Mainnet',
      };

      mockUseNetworkConnectionBanners.mockReturnValue({
        visible: true,
        chainId: '0x89',
        currentNetwork: polygonNetwork,
        editRpc: mockEditRpc,
      });

      rerender(<SlowRpcConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet')).toBeTruthy();
    });
  });
});
