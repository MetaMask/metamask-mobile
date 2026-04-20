import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { TokenSelectorItem, getSecurityTag } from './TokenSelectorItem';
import { SecurityDataType } from '../hooks/usePopularTokens';
import { ethers } from 'ethers';
import { useABTest } from '../../../../hooks';
import { createMockTokenWithBalance } from '../testUtils/fixtures';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

jest.mock('../../../../hooks', () => ({
  useABTest: jest.fn(),
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
      tokenSymbolRow: {},
      tokenSymbol: {},
      verifiedIcon: {},
      childrenWrapper: {},
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

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Icon = jest.fn(({ testID, name }: { testID?: string; name: string }) =>
    createElement(Text, { testID }, name),
  );
  return {
    __esModule: true,
    default: Icon,
    Icon,
    __mockIcon: Icon,
    IconColor: {
      InfoDefault: 'InfoDefault',
      WarningDefault: 'WarningDefault',
      ErrorDefault: 'ErrorDefault',
    },
    IconName: {
      VerifiedFilled: 'VerifiedFilled',
      Warning: 'Warning',
      Danger: 'Danger',
    },
    IconSize: { Sm: 'Sm', Xs: 'Xs' },
  };
});

const { __mockIcon: mockDSIcon } = jest.requireMock(
  '@metamask/design-system-react-native',
) as {
  __mockIcon: jest.Mock;
};

jest.mock('../../../../component-library/base-components/TagBase', () => {
  const { createElement } = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      startAccessory,
    }: {
      children: React.ReactNode;
      startAccessory?: React.ReactNode;
    }) =>
      createElement(
        View,
        null,
        startAccessory,
        typeof children === 'string'
          ? createElement(Text, null, children)
          : children,
      ),
    TagShape: { Rectangle: 'Rectangle', Pill: 'Pill' },
    TagSeverity: { Info: 'Info', Warning: 'Warning', Danger: 'Danger' },
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
  const mockUseABTest = jest.mocked(useABTest);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseABTest.mockReturnValue({
      variant: {
        showTokenBalanceFirst: false,
        removeTickerFromTokenBalance: false,
      },
      variantName: 'control',
      isActive: false,
    });
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

    it('renders verified icon when token is verified', () => {
      const token = createMockTokenWithBalance({
        symbol: 'ETH',
        isVerified: true,
      });

      const { getByTestId } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(getByTestId('token-verified-icon-ETH')).toBeTruthy();
      expect(mockDSIcon).toHaveBeenCalled();
      expect(mockDSIcon.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          testID: 'token-verified-icon-ETH',
          name: 'VerifiedFilled',
          size: 'Sm',
          color: 'InfoDefault',
        }),
      );
    });

    it('does not render verified icon when token is not verified', () => {
      const token = createMockTokenWithBalance({
        symbol: 'ETH',
        isVerified: false,
      });

      const { queryByTestId } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(queryByTestId('token-verified-icon-ETH')).toBeNull();
      expect(mockDSIcon).not.toHaveBeenCalled();
    });

    it('renders verified icon alongside no fee badge', () => {
      const token = createMockTokenWithBalance({
        symbol: 'ETH',
        isVerified: true,
      });

      const { getByTestId, getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} isNoFeeAsset />,
      );

      expect(getByTestId('token-verified-icon-ETH')).toBeTruthy();
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
    it('truncates long token names to 1 line', () => {
      const token = createMockTokenWithBalance({
        name: 'Very Long Token Name That Should Be Truncated',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      const tokenNameElement = getByText(
        'Very Long Token Name That Should Be Truncated',
      );

      expect(tokenNameElement.props.numberOfLines).toBe(1);
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

    it('renders token balance in a single line', () => {
      const token = createMockTokenWithBalance({
        balance: '50.0',
        symbol: 'TOKEN',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      const tokenBalanceElement = getByText('50 TOKEN');

      expect(tokenBalanceElement.props.numberOfLines).toBe(1);
    });

    it('renders fiat balance in a single line', () => {
      const token = createMockTokenWithBalance({
        balanceFiat: '$1,234.56',
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      const fiatBalanceElement = getByText('$1,234.56');

      expect(fiatBalanceElement.props.numberOfLines).toBe(1);
    });
  });

  describe('security badges', () => {
    it.each([SecurityDataType.Warning, SecurityDataType.Spam])(
      'shows Suspicious badge for %s type',
      (securityType) => {
        const token = createMockTokenWithBalance({
          securityData: { type: securityType },
        });

        const { getByText } = render(
          <TokenSelectorItem token={token} onPress={mockOnPress} />,
        );

        expect(getByText('bridge.token_suspicious')).toBeTruthy();
      },
    );

    it('shows Malicious badge for Malicious type', () => {
      const token = createMockTokenWithBalance({
        securityData: { type: SecurityDataType.Malicious },
      });

      const { getByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(getByText('bridge.token_malicious')).toBeTruthy();
    });

    it.each([
      SecurityDataType.Info,
      SecurityDataType.Benign,
      SecurityDataType.Verified,
    ])('does not show a security badge for %s type', (securityType) => {
      const token = createMockTokenWithBalance({
        securityData: { type: securityType },
      });

      const { queryByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(queryByText('bridge.token_suspicious')).toBeNull();
      expect(queryByText('bridge.token_malicious')).toBeNull();
    });

    it('does not show a security badge when securityData is absent', () => {
      const token = createMockTokenWithBalance({ securityData: undefined });

      const { queryByText } = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );

      expect(queryByText('bridge.token_suspicious')).toBeNull();
      expect(queryByText('bridge.token_malicious')).toBeNull();
    });

    it('renders Warning icon with WarningDefault color for Suspicious badge', () => {
      const token = createMockTokenWithBalance({
        securityData: { type: SecurityDataType.Warning },
      });

      render(<TokenSelectorItem token={token} onPress={mockOnPress} />);

      expect(mockDSIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Danger',
          color: 'WarningDefault',
          size: 'Sm',
        }),
        expect.anything(),
      );
    });

    it('renders Danger icon with ErrorDefault color for Malicious badge', () => {
      const token = createMockTokenWithBalance({
        securityData: { type: SecurityDataType.Malicious },
      });

      render(<TokenSelectorItem token={token} onPress={mockOnPress} />);

      expect(mockDSIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Warning',
          color: 'ErrorDefault',
          size: 'Sm',
        }),
        expect.anything(),
      );
    });
  });

  describe('A/B variants', () => {
    it('keeps fiat above token balance in the control layout', () => {
      const token = createMockTokenWithBalance({
        balance: '50.0',
        balanceFiat: '$500',
        symbol: 'USDC',
      });

      const controlRender = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );
      expect(controlRender.getByText('50 USDC')).toBeOnTheScreen();

      const controlTextOrder = controlRender
        .UNSAFE_getAllByType(RNText)
        .map((textNode) => String(textNode.props.children));
      expect(controlTextOrder.indexOf('$500')).toBeLessThan(
        controlTextOrder.indexOf('50 USDC'),
      );
    });

    it('shows token balance first without the ticker in the treatment layout', () => {
      mockUseABTest.mockReturnValue({
        variant: {
          showTokenBalanceFirst: true,
          removeTickerFromTokenBalance: true,
        },
        variantName: 'treatment',
        isActive: true,
      });

      const token = createMockTokenWithBalance({
        balance: '50.0',
        balanceFiat: '$500',
        symbol: 'USDC',
      });

      const treatmentRender = render(
        <TokenSelectorItem token={token} onPress={mockOnPress} />,
      );
      expect(treatmentRender.getByText('50')).toBeOnTheScreen();
      expect(treatmentRender.queryByText('50 USDC')).not.toBeOnTheScreen();

      const treatmentTextOrder = treatmentRender
        .UNSAFE_getAllByType(RNText)
        .map((textNode) => String(textNode.props.children));
      expect(treatmentTextOrder.indexOf('50')).toBeLessThan(
        treatmentTextOrder.indexOf('$500'),
      );
    });
  });
});

describe('getSecurityTag', () => {
  it.each([SecurityDataType.Warning, SecurityDataType.Spam])(
    'returns Warning severity config for %s type',
    (securityType) => {
      const result = getSecurityTag(securityType);

      expect(result).toEqual(
        expect.objectContaining({
          severity: 'Warning',
          iconName: 'Danger',
          iconColor: 'WarningDefault',
        }),
      );
    },
  );

  it('returns Danger severity config for Malicious type', () => {
    const result = getSecurityTag(SecurityDataType.Malicious);

    expect(result).toEqual(
      expect.objectContaining({
        severity: 'Danger',
        iconName: 'Warning',
        iconColor: 'ErrorDefault',
      }),
    );
  });

  it.each([
    SecurityDataType.Info,
    SecurityDataType.Benign,
    SecurityDataType.Verified,
  ])('returns null for %s type', (securityType) => {
    expect(getSecurityTag(securityType)).toBeNull();
  });

  it('returns null when securityType is undefined', () => {
    expect(getSecurityTag(undefined)).toBeNull();
  });
});
