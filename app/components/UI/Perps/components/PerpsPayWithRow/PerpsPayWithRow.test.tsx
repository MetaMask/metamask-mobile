import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsPayWithRow from './PerpsPayWithRow';
import type { PerpsToken } from '../PerpsTokenSelector';
import { PerpsPayWithRowSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock react-native at the top
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
  },
}));

// Mock dependencies
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      icon: {
        alternative: '#6A737D',
      },
    },
  })),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network-image' })),
  BLOCKAID_SUPPORTED_NETWORK_NAMES: {
    '0x1': 'Ethereum Mainnet',
    '0xa4b1': 'Arbitrum One',
  },
}));

describe('PerpsPayWithRow', () => {
  const mockToken: PerpsToken = {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    chainId: '0xa4b1' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    image: 'https://example.com/usdc.png',
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render basic token information', () => {
      const { getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('perps.deposit.payWith')).toBeTruthy();
      expect(getByText('100 USDC')).toBeTruthy();
      expect(getByText('USDC')).toBeTruthy();
    });

    it('should render USD equivalent when provided', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
          showUsdEquivalent
          usdEquivalent="$100.00"
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('≈ $100.00')).toBeTruthy();
      expect(
        getByTestId(PerpsPayWithRowSelectorsIDs.USD_EQUIVALENT),
      ).toBeTruthy();
    });

    it('should not render USD equivalent when showUsdEquivalent is false', () => {
      const { queryByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
          showUsdEquivalent={false}
          usdEquivalent="$100.00"
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(queryByText('≈ $100.00')).toBeNull();
    });

    it('should not render USD equivalent when usdEquivalent is not provided', () => {
      const { queryByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
          showUsdEquivalent
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(queryByText(/≈/)).toBeNull();
    });

    it('should use default testID when none provided', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByTestId(PerpsPayWithRowSelectorsIDs.MAIN)).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      const customTestID = 'custom-test-id';
      const { getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
          testID={customTestID}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByTestId(customTestID)).toBeTruthy();
    });
  });

  describe('Token Display', () => {
    it('should display token name when available', () => {
      const { getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('USDC')).toBeTruthy();
    });

    it('should fallback to symbol when name is not available', () => {
      const tokenWithoutName = { ...mockToken, name: undefined };

      const { getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={tokenWithoutName}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('USDC')).toBeTruthy();
    });

    it('should handle different token amounts', () => {
      const amounts = ['0', '0.001', '100', '999999.99'];

      amounts.forEach((amount) => {
        const { getByText, unmount } = renderWithProvider(
          <PerpsPayWithRow
            selectedToken={mockToken}
            tokenAmount={amount}
            onPress={mockOnPress}
          />,
          {
            state: {
              engine: {
                backgroundState: {
                  PreferencesController: {
                    isIpfsGatewayEnabled: true,
                  },
                },
              },
            },
          },
        );

        expect(getByText(`${amount} USDC`)).toBeTruthy();
        unmount();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onPress when pressed', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      const row = getByTestId(PerpsPayWithRowSelectorsIDs.MAIN);
      fireEvent.press(row);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple presses', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      const row = getByTestId(PerpsPayWithRowSelectorsIDs.MAIN);
      fireEvent.press(row);
      fireEvent.press(row);
      fireEvent.press(row);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('USD Equivalent Display', () => {
    it('should show USD equivalent with correct testID', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="100"
          onPress={mockOnPress}
          showUsdEquivalent
          usdEquivalent="$100.00"
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      const usdText = getByTestId(PerpsPayWithRowSelectorsIDs.USD_EQUIVALENT);
      expect(usdText).toBeTruthy();
      expect(getByText('≈ $100.00')).toBeTruthy();
    });

    it('should handle different USD equivalent formats', () => {
      const usdAmounts = ['$0.00', '$1.23', '$999,999.99', '$1,234.56'];

      usdAmounts.forEach((usdAmount) => {
        const { getByText, unmount } = renderWithProvider(
          <PerpsPayWithRow
            selectedToken={mockToken}
            tokenAmount="100"
            onPress={mockOnPress}
            showUsdEquivalent
            usdEquivalent={usdAmount}
          />,
          {
            state: {
              engine: {
                backgroundState: {
                  PreferencesController: {
                    isIpfsGatewayEnabled: true,
                  },
                },
              },
            },
          },
        );

        expect(getByText(`≈ ${usdAmount}`)).toBeTruthy();
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token symbol', () => {
      const tokenWithEmptySymbol = { ...mockToken, symbol: '' };

      const { getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={tokenWithEmptySymbol}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('100 ')).toBeTruthy();
    });

    it('should handle token without image', () => {
      const tokenWithoutImage = { ...mockToken, image: undefined };

      const { getByText } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={tokenWithoutImage}
          tokenAmount="100"
          onPress={mockOnPress}
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      expect(getByText('USDC')).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should work with all features enabled', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <PerpsPayWithRow
          selectedToken={mockToken}
          tokenAmount="1000"
          onPress={mockOnPress}
          showUsdEquivalent
          usdEquivalent="$1,000.00"
          testID="custom-pay-with-row"
        />,
        {
          state: {
            engine: {
              backgroundState: {
                PreferencesController: {
                  isIpfsGatewayEnabled: true,
                },
              },
            },
          },
        },
      );

      // Check all elements are present
      expect(getByText('perps.deposit.payWith')).toBeTruthy();
      expect(getByText('1000 USDC')).toBeTruthy();
      expect(getByText('USDC')).toBeTruthy();
      expect(getByText('≈ $1,000.00')).toBeTruthy();
      expect(getByText('USDC')).toBeTruthy();
      expect(getByTestId('custom-pay-with-row')).toBeTruthy();

      // Test interaction
      fireEvent.press(getByTestId('custom-pay-with-row'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });
});
