import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { TextColor } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import QuickBuyRoot from './QuickBuyRoot';
import { useQuickBuyContext } from './useQuickBuyContext';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
import { useQuickBuySetup } from './hooks/useQuickBuySetup';
import { positionToQuickBuyTarget } from './types';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import type { Position } from '@metamask/social-controllers';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { QuickBuyEventProperties } from './analytics';

jest.mock('./hooks/useQuickBuyController', () => ({
  useQuickBuyController: jest.fn(),
}));

jest.mock('./hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

const mockTrack = jest.fn();

jest.mock('../../../analytics', () => {
  const actual = jest.requireActual('../../../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

let storedOnOpenCallback: (() => void) | undefined;
const mockOnCloseDialog = jest.fn((cb?: () => void) => cb?.());

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheetDialog: ReactMock.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: unknown;
          onClose?: () => void;
        },
        ref: unknown,
      ) => {
        ReactMock.useImperativeHandle(ref, () => ({
          onOpenDialog: (cb: () => void) => {
            storedOnOpenCallback = cb;
          },
          onCloseDialog: mockOnCloseDialog,
        }));
        return ReactMock.createElement(
          View,
          { testID: 'mock-bottom-sheet-dialog', onTouchEnd: onClose },
          children,
        );
      },
    ),
  };
});

// Render Animated.View as a plain host View that forwards layout-animation props
// (entering/exiting) so the suppression of the exit transition is observable.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const AnimatedView = ReactMock.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactMock.createElement(View, { ...props, ref }),
  );
  AnimatedView.displayName = 'MockAnimatedView';
  return {
    ...actual,
    __esModule: true,
    default: { ...actual.default, View: AnimatedView },
  };
});

jest.mock('./components/QuickBuyToolbar', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-toolbar' }, 'toolbar'),
  };
});

jest.mock('./QuickBuyAmount', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-amount-section' },
        'amount-section',
      ),
  };
});

jest.mock('./components/QuickBuyActionFooter', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-action-footer' }, 'footer'),
  };
});

jest.mock('./QuickBuyPriceImpactConfirmScreen', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-price-impact-confirm' },
        'price-impact-confirm',
      ),
  };
});

jest.mock('./QuickBuyBottomSheetSkeleton', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-skeleton' },
        'quick-buy-content-loading',
      ),
  };
});

jest.mock('../../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockCreateRef = () => ({ current: null });

const buildHookResult = (
  overrides: Partial<UseQuickBuyControllerResult> = {},
): UseQuickBuyControllerResult => ({
  hiddenInputRef: mockCreateRef() as never,
  activeQuote: undefined,
  destToken: undefined,
  isSetupLoading: false,
  isUnsupportedChain: false,
  sourceToken: undefined,
  sourceChainId: '0x1',
  sourceTokenOptions: [],
  selectedSourceToken: undefined,
  isSourcePickerOpen: false,
  setIsSourcePickerOpen: jest.fn(),
  setSelectedSourceToken: jest.fn(),
  currentCurrency: 'USD',
  amountDisplayMode: 'fiat',
  fiatAmount: '',
  fiatAmountLabel: '$0.00',
  sliderPercent: 0,
  maxSpendFiat: 0,
  formattedExchangeRate: undefined,
  metamaskFeePercent: 0,
  estimatedReceiveAmount: undefined,
  sourceBalanceFiat: '$0.00',
  sourceBalanceDisplay: undefined,
  destBalanceFiat: undefined,
  formattedNetworkFee: '-',
  formattedSlippage: '-',
  formattedMinimumReceived: '-',
  formattedMinimumReceivedFiat: undefined,
  formattedPriceImpact: '-',
  formattedRate: undefined,
  totalAmountFiat: '$0',
  isQuoteLoading: false,
  isBlockingQuoteLoad: false,
  isSubmittingTx: false,
  isTotalLoading: false,
  sortedQuotes: [],
  selectedQuoteRequestId: undefined,
  setSelectedQuoteRequestId: jest.fn(),
  handleSelectQuote: jest.fn(),
  quotesLastFetchedAt: null,
  refreshCount: 0,
  quoteRefreshRateMs: 30000,
  maxRefreshCount: 5,
  refetchQuotes: jest.fn(),
  isHardwareSolanaBlocked: false,
  priceImpactViewData: {
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  },
  isPriceImpactError: false,
  isPresetAddFundsMode: false,
  buttonError: null,
  hasValidAmount: false,
  isConfirmDisabled: true,
  confirmButtonState: 'idle',
  getButtonLabel: () => 'social_leaderboard.trader_position.buy',
  handleClose: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
  handleQuickAmountPress: jest.fn(),
  usdToCurrentCurrencyRate: undefined,
  handleAmountAreaPress: jest.fn(),
  handleAmountChange: jest.fn(),
  handleToggleAmountDisplay: jest.fn(),
  handleSelectSourceToken: jest.fn(),
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
  hasSellableBalance: false,
  sourceAmountTokens: '',
  sourceTokenAmount: undefined,
  hasSourcePrice: true,
  isSliderDisabled: false,
  sellDestTokenOptions: [],
  selectedDestStable: undefined,
  handleSelectDestStable: jest.fn(),
  handleConfirm: jest.fn(),
  ...overrides,
});

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    positionAmount: 1000,
    boughtUsd: 500,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 500,
    trades: [],
    lastTradeAt: 0,
    currentValueUSD: 900,
    pnlValueUsd: 400,
    pnlPercent: 80,
    ...overrides,
  }) as Position;

describe('QuickBuyRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedOnOpenCallback = undefined;
    mockOnCloseDialog.mockImplementation((cb?: () => void) => cb?.());
    (useQuickBuyController as jest.Mock).mockReturnValue(buildHookResult());
    (useQuickBuySetup as jest.Mock).mockReturnValue({
      chainId: '0x1',
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: false,
    });
  });

  it('renders default AmountScreen content when no children are passed', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    expect(screen.getByTestId('mock-toolbar')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-amount-section')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-action-footer')).toBeOnTheScreen();
  });

  it('fires SOCIAL_QUICK_BUY_SHEET_VIEWED when the sheet opens with a source', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
        analyticsContext={{ source: 'market_insights' }}
      />,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      expect.objectContaining({
        [QuickBuyEventProperties.ASSET_NAME]: 'PEPE',
        [QuickBuyEventProperties.SOURCE]: 'market_insights',
        [QuickBuyEventProperties.TRADER_TRADE_TYPE]: 'buy',
      }),
    );
  });

  it('does not fire SOCIAL_QUICK_BUY_SHEET_VIEWED when analytics source is absent', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('includes market_cap and trader_trade_type from analyticsContext when provided', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
        analyticsContext={{
          source: 'profile_position',
          marketCap: 1_500_000,
          traderTradeType: 'sell',
        }}
      />,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      {
        [QuickBuyEventProperties.ASSET_NAME]: 'PEPE',
        [QuickBuyEventProperties.MARKET_CAP]: 1_500_000,
        [QuickBuyEventProperties.SOURCE]: 'profile_position',
        [QuickBuyEventProperties.TRADER_TRADE_TYPE]: 'sell',
      },
    );
  });

  it('renders the price impact confirm screen via the children override', () => {
    const MockPriceImpactConfirmScreen = () => {
      const React2 = jest.requireActual('react');
      const { Text: RNText } = jest.requireActual('react-native');
      return React2.createElement(
        RNText,
        { testID: 'mock-price-impact-confirm' },
        'price-impact-confirm',
      );
    };

    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      >
        <MockPriceImpactConfirmScreen />
      </QuickBuyRoot>,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    // children override is rendered regardless of activeScreen value
    expect(screen.getByTestId('mock-price-impact-confirm')).toBeOnTheScreen();
  });

  it('shows unsupported chain message without amount flow', () => {
    (useQuickBuyController as jest.Mock).mockReturnValue(
      buildHookResult({ isUnsupportedChain: true }),
    );

    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );

    act(() => {
      storedOnOpenCallback?.();
    });

    expect(
      screen.getByText('social_leaderboard.quick_buy.unsupported_chain'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('mock-amount-section')).not.toBeOnTheScreen();
  });

  it('renders nothing when isVisible is false', () => {
    const { toJSON } = renderWithProvider(
      <QuickBuyRoot
        isVisible={false}
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when target is null', () => {
    const { toJSON } = renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={null}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('applies the measured locked height after the first layout', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );
    act(() => {
      storedOnOpenCallback?.();
    });

    const container = screen.getByTestId('quick-buy-content-container');
    act(() => {
      fireEvent(container, 'layout', {
        nativeEvent: { layout: { height: 480 } },
      });
    });

    expect(StyleSheet.flatten(container.props.style)).toMatchObject({
      height: 480,
    });
  });

  it('keeps the initial locked height when a later layout reports a different height', () => {
    renderWithProvider(
      <QuickBuyRoot
        isVisible
        target={positionToQuickBuyTarget(createPosition())}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        onClose={jest.fn()}
      />,
    );
    act(() => {
      storedOnOpenCallback?.();
    });

    const container = screen.getByTestId('quick-buy-content-container');
    act(() => {
      fireEvent(container, 'layout', {
        nativeEvent: { layout: { height: 480 } },
      });
    });
    act(() => {
      fireEvent(container, 'layout', {
        nativeEvent: { layout: { height: 300 } },
      });
    });

    expect(StyleSheet.flatten(container.props.style)).toMatchObject({
      height: 480,
    });
  });

  describe('close behavior', () => {
    const CloseProbe = () => {
      const { onClose } = useQuickBuyContext();
      return <Pressable testID="probe-close" onPress={onClose} />;
    };

    it('animates the sheet down via onCloseDialog and runs the parent onClose', () => {
      const onClose = jest.fn();
      renderWithProvider(
        <QuickBuyRoot
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={onClose}
        >
          <CloseProbe />
        </QuickBuyRoot>,
      );
      act(() => {
        storedOnOpenCallback?.();
      });

      act(() => {
        fireEvent.press(screen.getByTestId('probe-close'));
      });

      expect(mockOnCloseDialog).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('suppresses the content exit transition while closing', () => {
      renderWithProvider(
        <QuickBuyRoot
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        >
          <CloseProbe />
        </QuickBuyRoot>,
      );
      act(() => {
        storedOnOpenCallback?.();
      });

      const beforeContainer = screen.getByTestId('quick-buy-content-container');
      const animatedBefore = beforeContainer.children[0] as {
        props: { exiting?: unknown };
      };
      expect(animatedBefore.props.exiting).toBeDefined();

      act(() => {
        fireEvent.press(screen.getByTestId('probe-close'));
      });

      const afterContainer = screen.getByTestId('quick-buy-content-container');
      const animatedAfter = afterContainer.children[0] as {
        props: { exiting?: unknown };
      };
      expect(animatedAfter.props.exiting).toBeUndefined();
    });
  });

  describe('screen navigation', () => {
    const NavigationProbe = () => {
      const { activeScreen, setActiveScreen } = useQuickBuyContext();
      return (
        <>
          <Text testID="active-screen">{activeScreen}</Text>
          <Pressable
            testID="nav-payWith"
            onPress={() => setActiveScreen('payWith')}
          />
          <Pressable
            testID="nav-quoteDetails"
            onPress={() => setActiveScreen('quoteDetails')}
          />
          <Pressable
            testID="nav-amount"
            onPress={() => setActiveScreen('amount')}
          />
        </>
      );
    };

    const renderWithNavigation = () => {
      renderWithProvider(
        <QuickBuyRoot
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        >
          <NavigationProbe />
        </QuickBuyRoot>,
      );
      act(() => {
        storedOnOpenCallback?.();
      });
    };

    it('starts on the amount screen', () => {
      renderWithNavigation();

      expect(screen.getByTestId('active-screen')).toHaveTextContent('amount');
    });

    it('navigates forward to a deeper screen', () => {
      renderWithNavigation();

      act(() => {
        fireEvent.press(screen.getByTestId('nav-payWith'));
      });

      expect(screen.getByTestId('active-screen')).toHaveTextContent('payWith');
    });

    it('navigates back to a shallower screen', () => {
      renderWithNavigation();

      act(() => {
        fireEvent.press(screen.getByTestId('nav-payWith'));
      });
      act(() => {
        fireEvent.press(screen.getByTestId('nav-amount'));
      });

      expect(screen.getByTestId('active-screen')).toHaveTextContent('amount');
    });

    it('navigates between equal-depth screens', () => {
      renderWithNavigation();

      act(() => {
        fireEvent.press(screen.getByTestId('nav-payWith'));
      });
      act(() => {
        fireEvent.press(screen.getByTestId('nav-quoteDetails'));
      });

      expect(screen.getByTestId('active-screen')).toHaveTextContent(
        'quoteDetails',
      );
    });
  });
});

describe('useQuickBuyContext guard', () => {
  it('throws when useQuickBuyContext is called outside QuickBuy.Root', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const ContextProbe = () => {
      useQuickBuyContext();
      return null;
    };

    expect(() => renderWithProvider(<ContextProbe />)).toThrow(
      'QuickBuy compound components must be rendered within QuickBuy.Root',
    );

    consoleError.mockRestore();
  });
});
