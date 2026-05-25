import React from 'react';
import { act, screen } from '@testing-library/react-native';
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

jest.mock('./hooks/useQuickBuyController', () => ({
  useQuickBuyController: jest.fn(),
}));

jest.mock('./hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

let storedOnOpenCallback: (() => void) | undefined;

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
  amountDisplayMode: 'fiat',
  usdAmount: '',
  sliderPercent: 0,
  maxSpendUsd: 0,
  formattedExchangeRate: undefined,
  metamaskFeePercent: 0,
  estimatedReceiveAmount: undefined,
  sourceBalanceFiat: '$0.00',
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
