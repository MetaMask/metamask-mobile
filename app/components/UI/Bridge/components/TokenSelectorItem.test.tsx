import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenSelectorItem } from './TokenSelectorItem';
import { ethers } from 'ethers';
import { createMockTokenWithBalance } from '../testUtils/fixtures';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'bridge.no_mm_fee': 'No MM Fee',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      tokenInfo: {},
      selectedIndicator: {},
      itemWrapper: {},
      balance: {},
      skeleton: {},
      secondaryBalance: {},
      badgeWrapper: {},
      noFeeBadge: {},
      selectedItemWrapperReset: {},
    },
  }),
}));

jest.mock('../../../../../wdio/utils/generateTestId', () => ({
  __esModule: true,
  default: () => ({}),
}));

jest.mock(
  '../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);

jest.mock('../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: () => null,
  BadgeVariant: { Network: 'Network' },
}));

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => ({ __esModule: true, default: () => null }),
);

jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Md: 'Md' },
}));

jest.mock('../../../../component-library/base-components/TagBase', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      createElement(Text, null, children),
    TagShape: { Rectangle: 'Rectangle' },
    TagSeverity: { Info: 'Info' },
  };
});

jest.mock('../../../../component-library/components/Tags/Tag', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ label }: { label: string }) => createElement(Text, null, label),
  };
});

describe('TokenSelectorItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders token symbol and name', () => {
      const token = createMockTokenWithBalance({
        symbol: 'ETH',
        name: 'Ethereum',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText('ETH')).toBeTruthy();
      expect(getByText('Ethereum')).toBeTruthy();
    });

    it('renders balance and fiat value when shouldShowBalance is true', () => {
      const token = createMockTokenWithBalance({
        balance: '50.0',
        balanceFiat: '$500',
        symbol: 'USDC',
      });

      const { getByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance
        />,
      );

      expect(getByText('$500')).toBeTruthy();
      expect(getByText('50 USDC')).toBeTruthy();
    });

    it('hides balance when shouldShowBalance is false', () => {
      const token = createMockTokenWithBalance({
        balance: '50.0',
        balanceFiat: '$500',
      });

      const { queryByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance={false}
        />,
      );

      expect(queryByText('$500')).toBeNull();
    });

    it('renders selected indicator when isSelected is true', () => {
      const token = createMockTokenWithBalance();

      const { UNSAFE_root } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} isSelected />,
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders no fee badge when isNoFeeAsset is true', () => {
      const token = createMockTokenWithBalance();

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} isNoFeeAsset />,
      );

      expect(getByText('No MM Fee')).toBeTruthy();
    });

    it('renders children when provided', () => {
      const token = createMockTokenWithBalance();

      const { UNSAFE_root } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress}>
          <></>
        </TokenSelectorItem>,
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders network badge when networkImageSource is provided', () => {
      const token = createMockTokenWithBalance();

      const { getByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          networkName="Ethereum"
          networkImageSource={{ uri: 'https://example.com/network.png' }}
        />,
      );

      expect(getByText('TEST')).toBeTruthy();
    });

    it('renders native token when address is zero address', () => {
      const token = createMockTokenWithBalance({
        address: ethers.constants.AddressZero,
        symbol: 'ETH',
        name: 'Ethereum',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText('ETH')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress with token when pressed', () => {
      const token = createMockTokenWithBalance();

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('TEST'));

      expect(mockOnPress).toHaveBeenCalledWith(token);
    });
  });

  describe('balance formatting', () => {
    it.each([
      ['zero balance', '0', '0 TOKEN'],
      ['small balance', '0.000001', '< 0.00001 TOKEN'],
    ])('formats %s correctly', (_, balance, expected) => {
      const token = createMockTokenWithBalance({ balance, symbol: 'TOKEN' });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText(expected)).toBeTruthy();
    });
  });

  describe('balance display states', () => {
    it('does not render balance text when balance is loading (lowercase)', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: TOKEN_BALANCE_LOADING,
      });

      const { queryByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance
        />,
      );

      expect(queryByText(TOKEN_BALANCE_LOADING)).toBeNull();
    });

    it('does not render balance text when balance is loading (uppercase)', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: TOKEN_BALANCE_LOADING_UPPERCASE,
      });

      const { queryByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance
        />,
      );

      expect(queryByText(TOKEN_BALANCE_LOADING_UPPERCASE)).toBeNull();
    });

    it('renders nothing when balance rate is undefined', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: TOKEN_RATE_UNDEFINED,
      });

      const { queryByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance
        />,
      );

      expect(queryByText(TOKEN_RATE_UNDEFINED)).toBeNull();
    });

    it('renders fiat balance when balance is available', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: '$1,234.56',
      });

      const { getByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance
        />,
      );

      expect(getByText('$1,234.56')).toBeTruthy();
    });

    it('does not render balance when shouldShowBalance is false', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: '$1,234.56',
      });

      const { queryByText } = render(
        <TokenSelectorItem
          token={token}
          onPress={mockOnPress}
          shouldShowBalance={false}
        />,
      );

      expect(queryByText('$1,234.56')).toBeNull();
    });
  });

  describe('text truncation', () => {
    it('truncates long token names to 2 lines', () => {
      const token = createMockTokenWithBalance({
        name: 'Very Long Token Name That Should Be Truncated',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      const tokenNameElement = getByText(
        'Very Long Token Name That Should Be Truncated',
      );

      expect(tokenNameElement.props.numberOfLines).toBe(2);
    });

    it('applies tail ellipsize mode to token names', () => {
      const token = createMockTokenWithBalance({
        name: 'Very Long Token Name That Should Be Truncated',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      const tokenNameElement = getByText(
        'Very Long Token Name That Should Be Truncated',
      );

      expect(tokenNameElement.props.ellipsizeMode).toBe('tail');
    });
  });
});
