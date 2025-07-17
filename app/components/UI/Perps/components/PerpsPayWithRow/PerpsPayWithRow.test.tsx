// Mock dependencies - these need to be at the top
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsPayWithRow from './PerpsPayWithRow';
import type { PerpsToken } from '../PerpsTokenSelector';
import { CHAIN_IDS } from '@metamask/transaction-controller';

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

// Mock Avatar components to avoid Redux dependency
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: {
    Md: 'AvatarSize.Md',
  },
}));

jest.mock('../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken', () => ({
  __esModule: true,
  default: ({ name, imageSource, size }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="avatar-token">
        <Text>{name}</Text>
      </View>
    );
  },
}));

// Mock BadgeNetwork
jest.mock('../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork', () => ({
  __esModule: true,
  default: ({ name, imageSource }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="badge-network">
        <Text>{name}</Text>
      </View>
    );
  },
}));

// Mock BadgeWrapper
jest.mock('../../../../../component-library/components/Badges/BadgeWrapper', () => ({
  __esModule: true,
  default: ({ children, badgeElement }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="badge-wrapper">
        {children}
        {badgeElement}
      </View>
    );
  },
  BadgePosition: {
    BottomRight: 'BottomRight',
  },
}));

// Mock Icon
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: ({ name, size, color }: any) => {
    const { View } = require('react-native');
    return <View testID="icon" />;
  },
  IconName: {
    ArrowDown: 'IconName.ArrowDown',
  },
  IconSize: {
    Md: 'IconSize.Md',
  },
}));

// Mock ListItem components
jest.mock('../../../../../component-library/components/List/ListItem', () => ({
  __esModule: true,
  default: ({ children, gap }: any) => {
    const { View } = require('react-native');
    return <View testID="list-item">{children}</View>;
  },
}));

jest.mock('../../../../../component-library/components/List/ListItemColumn', () => ({
  __esModule: true,
  default: ({ children, widthType }: any) => {
    const { View } = require('react-native');
    return <View testID="list-item-column">{children}</View>;
  },
  WidthType: {
    Fill: 'Fill',
  },
}));

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({ children, variant, color }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  TextColor: {
    Alternative: 'TextColor.Alternative',
    Muted: 'TextColor.Muted',
  },
  TextVariant: {
    BodyMD: 'TextVariant.BodyMD',
    BodySM: 'TextVariant.BodySM',
  },
}));

describe('PerpsPayWithRow', () => {
  const mockToken: PerpsToken = {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    chainId: '0xa4b1',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    image: 'https://example.com/usdc.png',
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic token information', () => {
    const { getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
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
    );

    expect(getByText('≈ $100.00')).toBeTruthy();
    expect(getByTestId('perps-pay-with-row-usd-equivalent')).toBeTruthy();
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
    );

    expect(queryByText(/≈/)).toBeNull();
  });

  it('should call onPress when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const row = getByTestId('perps-pay-with-row');
    fireEvent.press(row);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render AvatarToken with image when provided', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const avatar = getByTestId('avatar-token');
    expect(avatar).toBeTruthy();
    expect(getByText('USD Coin')).toBeTruthy();
  });

  it('should render AvatarToken without image when not provided', () => {
    const tokenWithoutImage = { ...mockToken, image: undefined };

    const { getByTestId, getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithoutImage}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const avatar = getByTestId('avatar-token');
    expect(avatar).toBeTruthy();
    expect(getByText('USD Coin')).toBeTruthy();
  });

  it('should render network badge with correct name', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const badge = getByTestId('badge-network');
    expect(badge).toBeTruthy();
    expect(getByText('Arbitrum One')).toBeTruthy();
  });

  it('should handle unknown network', () => {
    const tokenWithUnknownNetwork = { ...mockToken, chainId: '0x999' };

    const { getByTestId, getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithUnknownNetwork}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const badge = getByTestId('badge-network');
    expect(badge).toBeTruthy();
    expect(getByText('perps.unknown_network')).toBeTruthy();
  });

  it('should handle missing chainId', () => {
    const tokenWithoutChainId = { ...mockToken, chainId: undefined };

    const { getByTestId, getByText } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithoutChainId}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const badge = getByTestId('badge-network');
    expect(badge).toBeTruthy();
    // Should fallback to mainnet
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
  });

  it('should render arrow down icon', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const icon = getByTestId('icon');
    expect(icon).toBeTruthy();
  });

  it('should use custom testID when provided', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
        testID="custom-test-id"
      />,
    );

    expect(getByTestId('custom-test-id')).toBeTruthy();
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
      );

      expect(getByText(`${amount} USDC`)).toBeTruthy();
      unmount();
    });
  });
});
