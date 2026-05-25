import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Position } from '@metamask/social-controllers';
import { QuickBuy } from './quickBuy';
import {
  useQuickBuyController,
  type UseQuickBuyControllerResult,
} from './hooks/useQuickBuyController';
import { useQuickBuySetup } from './hooks/useQuickBuySetup';
import { positionToQuickBuyTarget } from './types';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';

const mockControllerState: {
  getResult: () => UseQuickBuyControllerResult;
} = {
  getResult: () => {
    throw new Error('QuickBuy controller mock not initialized');
  },
};

jest.mock('./hooks/useQuickBuyController', () => ({
  useQuickBuyController: jest.fn(),
}));

jest.mock('./hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

// Captures the onOpenBottomSheet callback registered by QuickBuyBottomSheetInner.
// Call storedOnOpenCallback() inside act() after render to simulate the sheet
// finishing its open animation and make isContentReady become true.
let storedOnOpenCallback: (() => void) | undefined;

// Render children directly so inner component content is visible
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactMock = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactMock.forwardRef(
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
          onOpenBottomSheet: (cb: () => void) => {
            storedOnOpenCallback = cb;
          },
        }));
        return ReactMock.createElement(
          View,
          { testID: 'mock-bottom-sheet', onTouchEnd: onClose },
          children,
        );
      },
    ),
  };
});

// Mock sub-components so their own dep trees don't pollute these tests
jest.mock('./components/QuickBuyToolbar', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-toolbar' }, 'toolbar'),
  };
});

jest.mock('./components/QuickBuyAmountSection', () => {
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
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(
        TouchableOpacity,
        {
          testID: 'quick-buy-confirm-button',
          onPress: () => {
            mockControllerState.getResult().handleConfirm();
          },
        },
        ReactMock.createElement(Text, null, 'confirm'),
      ),
  };
});

jest.mock('./QuickBuyConfirmButton', () => {
  const ReactMock = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
    }: {
      label: string;
      onPress: () => void;
      testID?: string;
    }) =>
      ReactMock.createElement(
        TouchableOpacity,
        { testID, onPress },
        ReactMock.createElement(Text, null, label),
      ),
  };
});

jest.mock('./QuickBuyBanners', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-banners' }, 'banners'),
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
  usdAmount: '',
  sliderPercent: 0,
  maxSpendUsd: 0,
  formattedExchangeRate: undefined,
  metamaskFeePercent: 0,
  estimatedReceiveAmount: undefined,
  sourceBalanceFiat: undefined,
  sourceBalanceDisplay: undefined,
  formattedNetworkFee: '-',
  formattedSlippage: '-',
  formattedMinimumReceived: '-',
  formattedPriceImpact: '-',
  totalAmountUsd: '$0',
  isQuoteLoading: false,
  isSubmittingTx: false,
  isTotalLoading: false,
  isHardwareSolanaBlocked: false,
  priceImpactViewData: {
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  },
  isPriceImpactError: false,
  buttonError: null,
  hasValidAmount: false,
  isConfirmDisabled: true,
  confirmButtonState: 'idle',
  getButtonLabel: () => 'social_leaderboard.trader_position.buy',
  handleClose: jest.fn(),
  handleSliderChange: jest.fn(),
  handleAmountAreaPress: jest.fn(),
  handleAmountChange: jest.fn(),
  handleToggleAmountDisplay: jest.fn(),
  handleSelectSourceToken: jest.fn(),
  amountDisplayMode: 'fiat',
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

const setMockQuickBuyController = (
  overrides: Partial<UseQuickBuyControllerResult> = {},
) => {
  mockControllerState.getResult = () => buildHookResult(overrides);
  (useQuickBuyController as jest.Mock).mockImplementation(() =>
    mockControllerState.getResult(),
  );
};

describe('QuickBuy.Root', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedOnOpenCallback = undefined;
    setMockQuickBuyController();
    (useQuickBuySetup as jest.Mock).mockReturnValue({
      chainId: '0x1',
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('outer gate', () => {
    it('renders nothing when isVisible is false', () => {
      renderWithProvider(
        <QuickBuy.Root
          isVisible={false}
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('mock-bottom-sheet')).not.toBeOnTheScreen();
    });

    it('mounts the inner sheet when visible with a valid position', () => {
      renderWithProvider(
        <QuickBuy.Root
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('inner sheet', () => {
    it('renders the toolbar after deferred content becomes ready', () => {
      renderWithProvider(
        <QuickBuy.Root
          isVisible
          target={positionToQuickBuyTarget(
            createPosition({ tokenSymbol: 'PEPE' }),
          )}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );

      act(() => {
        storedOnOpenCallback?.();
      });

      expect(screen.getByTestId('mock-toolbar')).toBeOnTheScreen();
    });

    it('renders the skeleton body before deferred content becomes ready', () => {
      renderWithProvider(
        <QuickBuy.Root
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-skeleton')).toBeOnTheScreen();
      expect(screen.queryByTestId('mock-toolbar')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('mock-amount-section')).not.toBeOnTheScreen();
    });

    it('shows an unsupported chain message instead of the buy flow', () => {
      setMockQuickBuyController({ isUnsupportedChain: true });

      renderWithProvider(
        <QuickBuy.Root
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
      expect(screen.queryByTestId('mock-toolbar')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('mock-amount-section')).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('quick-buy-confirm-button'),
      ).not.toBeOnTheScreen();
    });

    it('renders the amount input, footer details, and sticky confirm button for a supported chain', () => {
      setMockQuickBuyController({ isUnsupportedChain: false });

      renderWithProvider(
        <QuickBuy.Root
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );
      act(() => {
        storedOnOpenCallback?.();
      });

      expect(screen.getByTestId('mock-amount-section')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    });

    it('calls handleConfirm from the sticky confirm button', () => {
      const handleConfirm = jest.fn();
      setMockQuickBuyController({ isUnsupportedChain: false, handleConfirm });

      renderWithProvider(
        <QuickBuy.Root
          isVisible
          target={positionToQuickBuyTarget(createPosition())}
          features={TOP_TRADERS_QUICK_BUY_FEATURES}
          onClose={jest.fn()}
        />,
      );
      act(() => {
        storedOnOpenCallback?.();
      });

      fireEvent.press(screen.getByTestId('quick-buy-confirm-button'));

      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
