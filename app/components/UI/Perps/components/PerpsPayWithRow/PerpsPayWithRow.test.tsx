import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsPayWithRow from './PerpsPayWithRow';
import type { PerpsToken } from '../PerpsTokenSelector';
import { CHAIN_IDS } from '@metamask/transaction-controller';

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
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const AvatarToken =
      require('../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken').default;
    const avatar = UNSAFE_getByType(AvatarToken);

    expect(avatar.props.name).toBe('USD Coin');
    expect(avatar.props.imageSource).toEqual({
      uri: 'https://example.com/usdc.png',
    });
    expect(avatar.props.size).toBe('AvatarSize.Md');
  });

  it('should render AvatarToken without image when not provided', () => {
    const tokenWithoutImage = { ...mockToken, image: undefined };

    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithoutImage}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const AvatarToken =
      require('../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken').default;
    const avatar = UNSAFE_getByType(AvatarToken);

    expect(avatar.props.imageSource).toBeUndefined();
  });

  it('should render network badge with correct name', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const BadgeNetwork =
      require('../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork').default;
    const badge = UNSAFE_getByType(BadgeNetwork);

    expect(badge.props.name).toBe('Arbitrum One');
    expect(badge.props.imageSource).toEqual({ uri: 'network-image' });
  });

  it('should handle unknown network', () => {
    const tokenWithUnknownNetwork = { ...mockToken, chainId: '0x999' };

    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithUnknownNetwork}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const BadgeNetwork =
      require('../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork').default;
    const badge = UNSAFE_getByType(BadgeNetwork);

    expect(badge.props.name).toBe('perps.unknown_network');
  });

  it('should handle missing chainId', () => {
    const tokenWithoutChainId = { ...mockToken, chainId: undefined };

    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={tokenWithoutChainId}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const BadgeNetwork =
      require('../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork').default;
    const badge = UNSAFE_getByType(BadgeNetwork);

    // Should fallback to mainnet
    expect(badge.props.name).toBe('Ethereum Mainnet');
  });

  it('should render arrow down icon', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsPayWithRow
        selectedToken={mockToken}
        tokenAmount="100"
        onPress={mockOnPress}
      />,
    );

    const Icon =
      require('../../../../../component-library/components/Icons/Icon').default;
    const icon = UNSAFE_getByType(Icon);

    expect(icon.props.name).toBe('IconName.ArrowDown');
    expect(icon.props.size).toBe('IconSize.Md');
    expect(icon.props.color).toBe('#6A737D');
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
