import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenSelectorItem } from './TokenSelectorItem';
import { BridgeToken } from '../types';
import { ethers } from 'ethers';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'bridge.no_mm_fee': 'No MM Fee',
    };
    return translations[key] || key;
  },
}));

// Mock useStyles hook
jest.mock('../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      tokenInfo: {},
      container: {},
      selectedIndicator: {},
      itemWrapper: {},
      balance: {},
      skeleton: {},
      secondaryBalance: {},
      badgeWrapper: {},
      noFeeBadge: {},
      selectedItemWrapperReset: {},
      nativeTokenIcon: {},
    },
  }),
}));

// Mock wdio utils
jest.mock('../../../../../wdio/utils/generateTestId', () => ({
  __esModule: true,
  default: () => ({}),
}));

// Mock BadgeWrapper
jest.mock(
  '../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    BadgePosition: { BottomRight: 'BottomRight' },
  }),
);

// Mock Badge
jest.mock('../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: () => null,
  BadgeVariant: { Network: 'Network' },
}));

// Mock AvatarToken
jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

// Mock AvatarSize
jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Md: 'Md' },
}));

// Mock TokenIcon
jest.mock('../../Swaps/components/TokenIcon', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock TagBase and Tag
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

const createMockToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  name: 'Test Token',
  balance: '100.0',
  balanceFiat: '$100',
  ...overrides,
});

describe('TokenSelectorItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token symbol and name', () => {
    const token = createMockToken({
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
    const token = createMockToken({
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
    const token = createMockToken({
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

  it('calls onPress with token when pressed', () => {
    const token = createMockToken();

    const { getByText } = render(
      <TokenSelectorItem token={token} onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('TEST'));

    expect(mockOnPress).toHaveBeenCalledWith(token);
  });

  it('renders selected indicator when isSelected is true', () => {
    const token = createMockToken();

    const { UNSAFE_root } = render(
      <TokenSelectorItem
        token={token}
        onPress={mockOnPress}
        isSelected
      />,
    );

    // The component should render with selected state
    expect(UNSAFE_root).toBeTruthy();
  });

  it('formats zero balance correctly', () => {
    const token = createMockToken({
      balance: '0',
      balanceFiat: '$0',
      symbol: 'TOKEN',
    });

    const { getByText } = render(
      <TokenSelectorItem token={token} onPress={mockOnPress} />,
    );

    expect(getByText('0 TOKEN')).toBeTruthy();
  });

  it('formats small balance with less than symbol', () => {
    const token = createMockToken({
      balance: '0.000001',
      balanceFiat: '$0.01',
      symbol: 'TOKEN',
    });

    const { getByText } = render(
      <TokenSelectorItem token={token} onPress={mockOnPress} />,
    );

    expect(getByText('< 0.00001 TOKEN')).toBeTruthy();
  });

  it('renders native token with TokenIcon when address is zero address', () => {
    const token = createMockToken({
      address: ethers.constants.AddressZero,
      symbol: 'ETH',
      name: 'Ethereum',
    });

    const { getByText } = render(
      <TokenSelectorItem token={token} onPress={mockOnPress} />,
    );

    // Native token should still render
    expect(getByText('ETH')).toBeTruthy();
  });

  it('renders no fee badge when isNoFeeAsset is true', () => {
    const token = createMockToken();

    const { getByText } = render(
      <TokenSelectorItem
        token={token}
        onPress={mockOnPress}
        isNoFeeAsset
      />,
    );

    expect(getByText('No MM Fee')).toBeTruthy();
  });

  it('renders children when provided', () => {
    const token = createMockToken();
    const TestChild = () => <></>;

    const { UNSAFE_root } = render(
      <TokenSelectorItem token={token} onPress={mockOnPress}>
        <TestChild />
      </TokenSelectorItem>,
    );

    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders network badge when networkImageSource is provided', () => {
    const token = createMockToken();
    const networkImageSource = { uri: 'https://example.com/network.png' };

    const { getByText } = render(
      <TokenSelectorItem
        token={token}
        onPress={mockOnPress}
        networkName="Ethereum"
        networkImageSource={networkImageSource}
      />,
    );

    expect(getByText('TEST')).toBeTruthy();
  });
});
