import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import TokenDetailsStickyFooter from './TokenDetailsStickyFooter';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import type { TokenDetailsRouteParams } from '../constants/constants';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

const mockIsBuyable = jest.fn(() => true);
jest.mock('../../Ramp/hooks/useTokenBuyability', () => ({
  __esModule: true,
  default: () => ({ isBuyable: mockIsBuyable(), isLoading: false }),
}));

const mockIsTokenTradingOpen = jest.fn(() => true);
const mockIsStockToken = jest.fn(() => false);
jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isTokenTradingOpen: mockIsTokenTradingOpen,
    isStockToken: mockIsStockToken,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => undefined),
}));

jest.mock('../../AssetOverview/Price/hooks/useTokenChartPreferences', () => ({
  useTokenChartPreferences: () => ({
    chartType: 'line',
    chartInterval: '15m',
    indicators: [],
    setChartType: jest.fn(),
    setChartInterval: jest.fn(),
    setIndicators: jest.fn(),
  }),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
}));

jest.mock('../../../../util/ondoGeoRestrictions', () => ({
  ONDO_RESTRICTED_COUNTRIES: new Set(['US', 'GB']),
}));

jest.mock('./RwaUnavailableBottomSheet/RwaUnavailableBottomSheet', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return { ...actual, useTheme: jest.fn(() => actual.mockTheme) };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View, Text } = jest.requireActual('react-native');
  return {
    ...actual,
    Button: ({
      testID,
      children,
      twClassName,
      ...rest
    }: Record<string, unknown>) => (
      <View testID={testID} twClassName={twClassName} {...rest}>
        <Text>{children}</Text>
      </View>
    ),
    ButtonAnimated: ({
      testID,
      onPress,
      children,
      ...rest
    }: Record<string, unknown>) => (
      <View testID={testID} onPress={onPress} {...rest}>
        {children as React.ReactNode}
      </View>
    ),
  };
});

const mockOnBuy = jest.fn();
const mockOnSwap = jest.fn();
let mockHasEligibleSwapTokens = true;
jest.mock('../hooks/useStickyTokenActions', () => ({
  useStickyTokenActions: () => ({
    onBuy: mockOnBuy,
    onSwap: mockOnSwap,
    hasEligibleSwapTokens: mockHasEligibleSwapTokens,
    networkModal: null,
  }),
}));

const mockTrackStickyFooterTapped = jest.fn();
jest.mock('../hooks/useStickyFooterTracking', () => ({
  useStickyFooterTracking: () => mockTrackStickyFooterTapped,
}));

const mockToken: TokenDetailsRouteParams = {
  address: '0x123',
  symbol: 'ETH',
  decimals: 18,
  chainId: '0x1',
} as unknown as TokenDetailsRouteParams;

const mockSecurityData: TokenSecurityData = {
  resultType: undefined,
} as unknown as TokenSecurityData;

const defaultProps = {
  token: mockToken,
  securityData: mockSecurityData,
  balanceFiatUsd: 50,
};

const setupSelectorMock = (geolocation?: string) => {
  (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
    if (selector === getDetectedGeolocation) {
      return geolocation;
    }
    return undefined;
  });
};

describe('TokenDetailsStickyFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBuyable.mockReturnValue(true);
    mockIsTokenTradingOpen.mockReturnValue(true);
    mockHasEligibleSwapTokens = true;
    setupSelectorMock();
  });

  describe('button visibility', () => {
    it('shows both buttons when isBuyable and hasEligibleSwapTokens are true', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('shows only swap button when not buyable and hasEligibleSwapTokens is true', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(queryByText('Buy')).toBeNull();
    });

    it('shows only buy button when isBuyable and no eligible swap tokens', () => {
      mockHasEligibleSwapTokens = false;
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Buy')).toBeTruthy();
      expect(queryByText('Swap')).toBeNull();
    });

    it('shows buy button as fallback when not buyable and no eligible swap tokens', () => {
      mockIsBuyable.mockReturnValue(false);
      mockHasEligibleSwapTokens = false;
      const { getByText, queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Buy')).toBeTruthy();
      expect(queryByText('Swap')).toBeNull();
    });

    it('renders nothing when isTokenTradingOpen returns false', () => {
      mockIsTokenTradingOpen.mockReturnValue(false);
      const { queryByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(queryByText('Swap')).toBeNull();
      expect(queryByText('Buy')).toBeNull();
    });
  });

  describe('onStickyButtonsResolved callback', () => {
    it('reports "both" when both buttons are shown', () => {
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('both');
    });

    it('reports "swap" when only swap is shown', () => {
      mockIsBuyable.mockReturnValue(false);
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('swap');
    });

    it('reports "buy" when only buy is shown', () => {
      mockHasEligibleSwapTokens = false;
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith('buy');
    });

    it('reports null when trading is not open', () => {
      mockIsTokenTradingOpen.mockReturnValue(false);
      const onStickyButtonsResolved = jest.fn();
      render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onStickyButtonsResolved={onStickyButtonsResolved}
        />,
      );
      expect(onStickyButtonsResolved).toHaveBeenCalledWith(null);
    });
  });

  describe('success button logic - single button', () => {
    it('applies success style to the swap button when it is the only button', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Swap')).toBeTruthy();
    });

    it('applies success style to the buy button when it is the only button', () => {
      mockHasEligibleSwapTokens = false;
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );
      expect(getByText('Buy')).toBeTruthy();
    });
  });

  describe('success button logic - both buttons', () => {
    it('applies success style to swap when balance >= $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={150} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to buy when balance < $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('applies success style to swap at exactly $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={100} />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });

    it('handles undefined balanceFiatUsd gracefully (treats as $0, buy gets success)', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          balanceFiatUsd={undefined}
        />,
      );
      expect(getByText('Swap')).toBeTruthy();
      expect(getByText('Buy')).toBeTruthy();
    });
  });

  describe('Sticky Footer Button Tapped tracking', () => {
    it('tracks swap button tap with usd_amount_range when balance < $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        balanceFiatUsd: 50,
        tokenAddress: '0x123',
        chainId: '0x1',
        indicatorsActive: [],
      });
    });

    it('tracks buy button tap with usd_amount_range when balance < $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={50} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'buy',
        balanceFiatUsd: 50,
        tokenAddress: '0x123',
        chainId: '0x1',
        indicatorsActive: [],
      });
    });

    it('tracks swap tap with usd_amount_range when balance >= $100', () => {
      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} balanceFiatUsd={150} />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        balanceFiatUsd: 150,
        tokenAddress: '0x123',
        chainId: '0x1',
        indicatorsActive: [],
      });
    });

    it('tracks single swap button with usd_amount_range when balance is undefined', () => {
      mockIsBuyable.mockReturnValue(false);
      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          balanceFiatUsd={undefined}
        />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'swap',
        balanceFiatUsd: undefined,
        tokenAddress: '0x123',
        chainId: '0x1',
        indicatorsActive: [],
      });
    });
  });

  describe('geo-based button colors', () => {
    const geoProps = {
      ...defaultProps,
      swapTestID: 'swap-btn',
      buyTestID: 'buy-btn',
    };

    const defaultSuccessBg = `bg-[${LIGHT_MODE_SUCCESS_GREEN}]`;

    it('uses success (green) styles for non-Asia users', () => {
      setupSelectorMock('US');
      const { getByTestId } = render(
        <TokenDetailsStickyFooter {...geoProps} balanceFiatUsd={50} />,
      );

      const buyBtn = getByTestId('buy-btn');
      expect(buyBtn.props.twClassName).toBe(defaultSuccessBg);
    });

    it('uses error-default (red) styles for Asian users when useAmbientColor is true (JP)', () => {
      setupSelectorMock('JP');
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...geoProps}
          balanceFiatUsd={50}
          useAmbientColor
        />,
      );

      const buyBtn = getByTestId('buy-btn');
      expect(buyBtn.props.twClassName).toBe('bg-error-default');
    });

    it('uses error-default border on secondary button for Asian users when useAmbientColor is true (KR)', () => {
      setupSelectorMock('KR');
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...geoProps}
          balanceFiatUsd={50}
          useAmbientColor
        />,
      );

      const swapBtn = getByTestId('swap-btn');
      expect(swapBtn.props.twClassName).toBe(
        'bg-transparent border-error-default',
      );
    });

    it.each(['VN', 'TW', 'CN'])(
      'uses error-default for %s country code when useAmbientColor is true',
      (code) => {
        setupSelectorMock(code);
        const { getByTestId } = render(
          <TokenDetailsStickyFooter
            {...geoProps}
            balanceFiatUsd={50}
            useAmbientColor
          />,
        );

        const buyBtn = getByTestId('buy-btn');
        expect(buyBtn.props.twClassName).toBe('bg-error-default');
      },
    );

    it('uses success (green) for Asian users when useAmbientColor is false (control)', () => {
      setupSelectorMock('JP');
      const { getByTestId } = render(
        <TokenDetailsStickyFooter {...geoProps} balanceFiatUsd={50} />,
      );

      const buyBtn = getByTestId('buy-btn');
      expect(buyBtn.props.twClassName).toBe(defaultSuccessBg);
    });

    it('uses success (green) styles when geolocation is undefined', () => {
      setupSelectorMock(undefined);
      const { getByTestId } = render(
        <TokenDetailsStickyFooter {...geoProps} balanceFiatUsd={50} />,
      );

      const buyBtn = getByTestId('buy-btn');
      expect(buyBtn.props.twClassName).toBe(defaultSuccessBg);
    });

    it('uses success (green) styles for non-Asia country (GB)', () => {
      setupSelectorMock('GB');
      const { getByTestId } = render(
        <TokenDetailsStickyFooter {...geoProps} balanceFiatUsd={50} />,
      );

      const buyBtn = getByTestId('buy-btn');
      expect(buyBtn.props.twClassName).toBe(defaultSuccessBg);
    });
  });

  describe('security interception - token.symbol fallback to token.name', () => {
    it('passes token.name as tokenSymbol when symbol is missing', () => {
      const tokenWithoutSymbol = {
        ...mockToken,
        symbol: '',
        name: 'FakeToken',
      } as unknown as TokenDetailsRouteParams;

      const maliciousSecurityData = {
        resultType: 'Malicious',
        features: [],
      } as unknown as TokenSecurityData;

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          token={tokenWithoutSymbol}
          securityData={maliciousSecurityData}
        />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            tokenSymbol: 'FakeToken',
            description: expect.any(String),
          }),
        }),
      );
    });

    it('passes token.symbol as tokenSymbol when symbol is present', () => {
      const warningSecurityData = {
        resultType: 'Warning',
        features: [],
      } as unknown as TokenSecurityData;

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          securityData={warningSecurityData}
        />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            tokenSymbol: 'ETH',
            description: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('RWA geo-restriction', () => {
    it('blocks the buy action when token is a geo-restricted stock', () => {
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('US');

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockOnBuy).not.toHaveBeenCalled();
    });

    it('blocks the swap action when token is a geo-restricted stock', () => {
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('GB');

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );

      fireEvent.press(getByText('Swap'));

      expect(mockOnSwap).not.toHaveBeenCalled();
    });

    it('proceeds normally for a stock token in a non-restricted country', () => {
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('AR');

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockOnBuy).toHaveBeenCalled();
    });

    it('proceeds normally for a non-stock token even if in a restricted country', () => {
      mockIsStockToken.mockReturnValue(false);
      setupSelectorMock('US');

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(mockOnBuy).toHaveBeenCalled();
    });
  });

  describe('onSwapPress and onBuyPress callback timing', () => {
    it('calls onSwapPress only when navigation occurs (not geo-restricted)', () => {
      const onSwapPress = jest.fn();
      mockIsStockToken.mockReturnValue(false);

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onSwapPress={onSwapPress}
        />,
      );

      fireEvent.press(getByText('Swap'));

      expect(onSwapPress).toHaveBeenCalled();
      expect(mockOnSwap).toHaveBeenCalled();
    });

    it('does not call onSwapPress when geo-restricted', () => {
      const onSwapPress = jest.fn();
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('US');

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onSwapPress={onSwapPress}
        />,
      );

      fireEvent.press(getByText('Swap'));

      expect(onSwapPress).not.toHaveBeenCalled();
      expect(mockOnSwap).not.toHaveBeenCalled();
    });

    it('calls onBuyPress only when navigation occurs (not geo-restricted)', () => {
      const onBuyPress = jest.fn();
      mockIsStockToken.mockReturnValue(false);

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} onBuyPress={onBuyPress} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(onBuyPress).toHaveBeenCalled();
      expect(mockOnBuy).toHaveBeenCalled();
    });

    it('does not call onBuyPress when geo-restricted', () => {
      const onBuyPress = jest.fn();
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('GB');

      const { getByText } = render(
        <TokenDetailsStickyFooter {...defaultProps} onBuyPress={onBuyPress} />,
      );

      fireEvent.press(getByText('Buy'));

      expect(onBuyPress).not.toHaveBeenCalled();
      expect(mockOnBuy).not.toHaveBeenCalled();
    });

    it('defers onSwapPress until onProceed for security warning modal', () => {
      const onSwapPress = jest.fn();
      mockIsStockToken.mockReturnValue(false);

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onSwapPress={onSwapPress}
          securityData={
            {
              resultType: 'Warning',
              features: {},
            } as TokenSecurityData
          }
        />,
      );

      fireEvent.press(getByText('Swap'));

      // Neither callback fires when the warning modal is shown
      expect(onSwapPress).not.toHaveBeenCalled();
      expect(mockOnSwap).not.toHaveBeenCalled();

      // Simulate user tapping "Proceed" inside the modal
      const navigateCall = mockNavigate.mock.calls[0];
      const onProceed = navigateCall[1].params.onProceed;
      onProceed();

      expect(onSwapPress).toHaveBeenCalled();
      expect(mockOnSwap).toHaveBeenCalled();
    });

    it('defers onBuyPress until onProceed for security warning modal', () => {
      const onBuyPress = jest.fn();
      mockIsStockToken.mockReturnValue(false);

      const { getByText } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onBuyPress={onBuyPress}
          securityData={
            {
              resultType: 'Spam',
              features: {},
            } as TokenSecurityData
          }
        />,
      );

      fireEvent.press(getByText('Buy'));

      // Neither callback fires when the warning modal is shown
      expect(onBuyPress).not.toHaveBeenCalled();
      expect(mockOnBuy).not.toHaveBeenCalled();

      // Simulate user tapping "Proceed" inside the modal
      const navigateCall = mockNavigate.mock.calls[0];
      const onProceed = navigateCall[1].params.onProceed;
      onProceed();

      expect(onBuyPress).toHaveBeenCalled();
      expect(mockOnBuy).toHaveBeenCalled();
    });
  });

  describe('quick buy button', () => {
    const quickBuyTestID = 'quick-buy-btn';

    it('does not render the quick buy button when onQuickBuyPress is not provided', () => {
      const { queryByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          quickBuyTestID={quickBuyTestID}
        />,
      );
      expect(queryByTestId(quickBuyTestID)).toBeNull();
    });

    it('renders the quick buy button when onQuickBuyPress is provided', () => {
      const onQuickBuyPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={quickBuyTestID}
        />,
      );
      expect(getByTestId(quickBuyTestID)).toBeOnTheScreen();
    });

    it('invokes onQuickBuyPress on press', () => {
      const onQuickBuyPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={quickBuyTestID}
        />,
      );

      fireEvent.press(getByTestId(quickBuyTestID));

      expect(onQuickBuyPress).toHaveBeenCalledTimes(1);
    });

    it('tracks "quick_buy" cta type on press', () => {
      const onQuickBuyPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={quickBuyTestID}
          balanceFiatUsd={50}
        />,
      );

      fireEvent.press(getByTestId(quickBuyTestID));

      expect(mockTrackStickyFooterTapped).toHaveBeenCalledWith({
        ctaType: 'quick_buy',
        balanceFiatUsd: 50,
        tokenAddress: '0x123',
        chainId: '0x1',
        indicatorsActive: [],
      });
    });

    it('blocks quick buy when token is a geo-restricted stock', () => {
      mockIsStockToken.mockReturnValue(true);
      setupSelectorMock('US');
      const onQuickBuyPress = jest.fn();
      const { getByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={quickBuyTestID}
        />,
      );

      fireEvent.press(getByTestId(quickBuyTestID));

      expect(onQuickBuyPress).not.toHaveBeenCalled();
    });

    it('hides the quick buy button when the account has no eligible swap source', () => {
      mockHasEligibleSwapTokens = false;
      const onQuickBuyPress = jest.fn();
      const { queryByTestId } = render(
        <TokenDetailsStickyFooter
          {...defaultProps}
          onQuickBuyPress={onQuickBuyPress}
          quickBuyTestID={quickBuyTestID}
        />,
      );

      expect(queryByTestId(quickBuyTestID)).toBeNull();
    });
  });
});
