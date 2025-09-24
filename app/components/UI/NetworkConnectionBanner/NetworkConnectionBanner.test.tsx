import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import NetworkConnectionBanner from './NetworkConnectionBanner';
import { useNetworkConnectionBanner } from '../../hooks/useNetworkConnectionBanner';

jest.mock('../../hooks/useNetworkConnectionBanner');

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

jest.mock('../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: ({ size }: { size: Record<string, string> }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="icon">
        <Text testID="icon-size">{size}</Text>
      </View>
    );
  },
  IconName: {
    Danger: 'Danger',
  },
  IconSize: {
    Md: 'Md',
  },
  IconColor: {
    Default: 'Default',
  },
}));

const mockuseNetworkConnectionBanner =
  useNetworkConnectionBanner as jest.MockedFunction<
    typeof useNetworkConnectionBanner
  >;

describe('NetworkConnectionBanner', () => {
  const mockUpdateRpc = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('snapshots', () => {
    it('should match snapshot when banner is not visible', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: { visible: false },
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
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { toJSON } = render(<NetworkConnectionBanner />);

        expect(toJSON()).toMatchSnapshot();
      },
    );

    it('should match snapshot for different network', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
        },
        updateRpc: mockUpdateRpc,
      });

      const { toJSON } = render(<NetworkConnectionBanner />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('when banner is not visible', () => {
    it('should not render when visible is false', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: { visible: false },
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
        expectedIconTestId: 'animated-spinner',
      },
      {
        status: 'unavailable' as const,
        expectedMessage: 'Unable to connect to Ethereum Mainnet.',
        expectedIconTestId: 'icon',
      },
    ];

    it.each(statusTestCases)(
      'should render the banner with correct structure for $status status',
      ({ status, expectedMessage, expectedIconTestId }) => {
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByTestId, getByText } = render(<NetworkConnectionBanner />);

        expect(getByTestId(expectedIconTestId)).toBeTruthy();
        expect(getByText(expectedMessage)).toBeTruthy();
        expect(getByText('Update RPC')).toBeTruthy();
      },
    );

    it.each(statusTestCases)(
      'should display network name in the message for $status status',
      ({ status, expectedMessage }) => {
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        expect(getByText(expectedMessage)).toBeTruthy();
      },
    );

    it.each(statusTestCases)(
      'should call updateRpc when Update RPC button is pressed for $status status',
      ({ status }) => {
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        const updateButton = getByText('Update RPC');
        fireEvent.press(updateButton);

        expect(mockUpdateRpc).toHaveBeenCalledWith(
          'https://mainnet.infura.io/v3/test',
          status,
          '0x1',
        );
      },
    );

    it.each(statusTestCases)(
      'should render button with correct variant and properties for $status status',
      ({ status }) => {
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
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
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status: 'slow',
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { rerender, getByText } = render(<NetworkConnectionBanner />);

        expect(
          getByText('Still connecting to Ethereum Mainnet...'),
        ).toBeTruthy();

        // Change to unavailable status
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status: 'unavailable',
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        rerender(<NetworkConnectionBanner />);

        expect(
          getByText('Unable to connect to Ethereum Mainnet.'),
        ).toBeTruthy();
      });

      it('should update message when status changes from unavailable to slow', () => {
        // Start with unavailable status
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status: 'unavailable',
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { rerender, getByText } = render(<NetworkConnectionBanner />);

        expect(
          getByText('Unable to connect to Ethereum Mainnet.'),
        ).toBeTruthy();

        // Change to slow status
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status: 'slow',
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
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
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
        },
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet...')).toBeTruthy();
    });

    it('should handle network with special characters in name', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
          networkName: 'Test-Network (Beta)',
          rpcUrl: 'https://mainnet.infura.io/v3/test',
        },
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      expect(
        getByText('Still connecting to Test-Network (Beta)...'),
      ).toBeTruthy();
    });

    it('should handle network with very long name', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
          networkName: 'Very Long Network Name That Might Cause Layout Issues',
          rpcUrl: 'https://mainnet.infura.io/v3/test',
        },
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
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
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
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        const updateButton = getByText('Update RPC');
        expect(updateButton).toBeTruthy();

        // Test that button is pressable
        fireEvent.press(updateButton);
        expect(mockUpdateRpc).toHaveBeenCalledWith(
          'https://mainnet.infura.io/v3/test',
          status,
          '0x1',
        );
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
        mockuseNetworkConnectionBanner.mockReturnValue({
          networkConnectionBannerState: {
            visible: true,
            chainId: '0x1',
            status,
            networkName: '',
            rpcUrl: 'https://mainnet.infura.io/v3/test',
          },
          updateRpc: mockUpdateRpc,
        });

        const { getByText } = render(<NetworkConnectionBanner />);

        expect(getByText(expectedMessage)).toBeTruthy();
      },
    );

    it('should handle multiple rapid button presses', () => {
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
          networkName: 'Ethereum Mainnet',
          rpcUrl: 'https://mainnet.infura.io/v3/test',
        },
        updateRpc: mockUpdateRpc,
      });

      const { getByText } = render(<NetworkConnectionBanner />);

      const updateButton = getByText('Update RPC');

      // Press button multiple times rapidly
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);
      fireEvent.press(updateButton);

      expect(mockUpdateRpc).toHaveBeenCalledTimes(3);
      expect(mockUpdateRpc).toHaveBeenCalledWith(
        'https://mainnet.infura.io/v3/test',
        'slow',
        '0x1',
      );
    });
  });

  describe('component lifecycle', () => {
    it('should update when hook values change', () => {
      // Initially not visible
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: { visible: false },
        updateRpc: mockUpdateRpc,
      });

      const { rerender, queryByTestId, getByTestId } = render(
        <NetworkConnectionBanner />,
      );

      expect(queryByTestId('animated-spinner')).toBeNull();

      // Make it visible
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
          networkName: 'Ethereum Mainnet',
          rpcUrl: 'https://mainnet.infura.io/v3/test',
        },
        updateRpc: mockUpdateRpc,
      });

      rerender(<NetworkConnectionBanner />);

      expect(getByTestId('animated-spinner')).toBeTruthy();
    });

    it('should handle hook returning different network', () => {
      // Initially Ethereum
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x1',
          status: 'slow',
          networkName: 'Ethereum Mainnet',
          rpcUrl: 'https://mainnet.infura.io/v3/test',
        },
        updateRpc: mockUpdateRpc,
      });

      const { rerender, getByText } = render(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Ethereum Mainnet...')).toBeTruthy();

      // Switch to Polygon
      mockuseNetworkConnectionBanner.mockReturnValue({
        networkConnectionBannerState: {
          visible: true,
          chainId: '0x89',
          status: 'slow',
          networkName: 'Polygon Mainnet',
          rpcUrl: 'https://polygon-rpc.com',
        },
        updateRpc: mockUpdateRpc,
      });

      rerender(<NetworkConnectionBanner />);

      expect(getByText('Still connecting to Polygon Mainnet...')).toBeTruthy();
    });
  });
});
