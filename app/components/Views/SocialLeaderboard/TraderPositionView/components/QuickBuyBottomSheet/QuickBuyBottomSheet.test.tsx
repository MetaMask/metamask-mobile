import React from 'react';
import { InteractionManager } from 'react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Position } from '@metamask/social-controllers';
import QuickBuyBottomSheet from './QuickBuyBottomSheet';
import {
  useQuickBuyBottomSheet,
  type UseQuickBuyBottomSheetResult,
} from './useQuickBuyBottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';

// Mock the heavy hook so we can control all rendered state
jest.mock('./useQuickBuyBottomSheet', () => ({
  useQuickBuyBottomSheet: jest.fn(),
}));

jest.mock('./useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

// Render children directly so inner component content is visible
jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactMock.forwardRef(
        (
          {
            children,
            onClose,
          }: {
            children: unknown;
            onClose?: () => void;
          },
          _ref: unknown,
        ) =>
          ReactMock.createElement(
            View,
            { testID: 'mock-bottom-sheet', onTouchEnd: onClose },
            children,
          ),
      ),
    };
  },
);

// Mock sub-components so their own dep trees don't pollute these tests
jest.mock('./QuickBuyHeader', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ position }: { position: Position }) =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-header' },
        position.tokenSymbol,
      ),
  };
});

jest.mock('./QuickBuyAmountInput', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-amount-input' },
        'amount-input',
      ),
  };
});

jest.mock('./QuickBuyFooter', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactMock.createElement(Text, { testID: 'mock-footer' }, 'footer'),
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
  overrides: Partial<UseQuickBuyBottomSheetResult> = {},
): UseQuickBuyBottomSheetResult => ({
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
  estimatedReceiveAmount: undefined,
  sourceBalanceFiat: undefined,
  isQuoteLoading: false,
  isSubmittingTx: false,
  estimatedPoints: null,
  isRewardsLoading: false,
  shouldShowLiveRewardsEstimate: false,
  shouldShowRewardsOptInCta: false,
  shouldShowRewardsFallbackZero: false,
  hasRewardsError: false,
  accountOptedIn: false,
  rewardsAccountScope: null,
  hasError: false,
  hasValidAmount: false,
  isConfirmDisabled: true,
  isConfirmLoading: false,
  getButtonLabel: () => 'social_leaderboard.trader_position.buy',
  handleClose: jest.fn(),
  handlePresetPress: jest.fn(),
  handleAmountAreaPress: jest.fn(),
  handleAmountChange: jest.fn(),
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

describe('QuickBuyBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The shell defers content mount behind InteractionManager.runAfterInteractions;
    // the global test setup stubs it as a no-op, so run the callback synchronously
    // here to make the content observable.
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (cb: () => void) => {
        cb();
        return { cancel: jest.fn() };
      },
    );
    (useQuickBuyBottomSheet as jest.Mock).mockReturnValue(buildHookResult());
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
        <QuickBuyBottomSheet
          isVisible={false}
          position={createPosition()}
          onClose={jest.fn()}
        />,
      );

      expect(screen.queryByTestId('mock-bottom-sheet')).not.toBeOnTheScreen();
    });

    it('mounts the inner sheet when visible with a valid position', () => {
      renderWithProvider(
        <QuickBuyBottomSheet
          isVisible
          position={createPosition()}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-bottom-sheet')).toBeOnTheScreen();
    });
  });

  describe('inner sheet', () => {
    it('renders the header with the position token symbol', () => {
      renderWithProvider(
        <QuickBuyBottomSheet
          isVisible
          position={createPosition({ tokenSymbol: 'PEPE' })}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-header')).toBeOnTheScreen();
      expect(screen.getByText('PEPE')).toBeOnTheScreen();
    });

    it('renders the skeleton body before deferred content becomes ready', () => {
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: jest.fn() }),
      );

      renderWithProvider(
        <QuickBuyBottomSheet
          isVisible
          position={createPosition()}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-header')).toBeOnTheScreen();
      expect(screen.getByTestId('mock-skeleton')).toBeOnTheScreen();
      expect(screen.queryByTestId('mock-amount-input')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('mock-footer')).not.toBeOnTheScreen();
    });

    it('shows an unsupported chain message instead of the buy flow', () => {
      (useQuickBuyBottomSheet as jest.Mock).mockReturnValue(
        buildHookResult({ isUnsupportedChain: true }),
      );

      renderWithProvider(
        <QuickBuyBottomSheet
          isVisible
          position={createPosition()}
          onClose={jest.fn()}
        />,
      );

      expect(
        screen.getByText('social_leaderboard.quick_buy.unsupported_chain'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('mock-amount-input')).not.toBeOnTheScreen();
      expect(screen.queryByTestId('mock-footer')).not.toBeOnTheScreen();
    });

    it('renders the amount input and footer for a supported chain', () => {
      (useQuickBuyBottomSheet as jest.Mock).mockReturnValue(
        buildHookResult({ isUnsupportedChain: false }),
      );

      renderWithProvider(
        <QuickBuyBottomSheet
          isVisible
          position={createPosition()}
          onClose={jest.fn()}
        />,
      );

      expect(screen.getByTestId('mock-amount-input')).toBeOnTheScreen();
      expect(screen.getByTestId('mock-footer')).toBeOnTheScreen();
    });
  });
});
