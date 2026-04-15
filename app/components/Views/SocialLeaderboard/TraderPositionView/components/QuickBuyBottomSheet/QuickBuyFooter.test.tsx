import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyFooter from './QuickBuyFooter';

jest.mock('./SourceTokenPicker', () => {
  const ReactMock = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return ({
    options,
    onSelect,
  }: {
    options: BridgeToken[];
    onSelect: (token: BridgeToken) => void;
  }) =>
    ReactMock.createElement(
      View,
      { testID: 'mock-source-token-picker' },
      options.map((token: BridgeToken) =>
        ReactMock.createElement(
          TouchableOpacity,
          {
            key: token.symbol,
            testID: `picker-option-${token.symbol}`,
            onPress: () => onSelect(token),
          },
          ReactMock.createElement(Text, null, token.symbol),
        ),
      ),
    );
});

jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => 0),
}));

jest.mock('../../../../../UI/Rewards/components/RewardPointsAnimation', () => {
  const ReactMock = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: number }) =>
      ReactMock.createElement(
        Text,
        { testID: 'mock-rewards-animation' },
        `${value} pts`,
      ),
    RewardAnimationState: {
      Loading: 'loading',
      ErrorState: 'error',
      Idle: 'idle',
    },
  };
});

jest.mock(
  '../../../../../UI/Rewards/components/AddRewardsAccount/AddRewardsAccount',
  () => {
    const ReactMock = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ({ testID }: { testID?: string }) =>
      ReactMock.createElement(
        Text,
        { testID: testID ?? 'mock-add-rewards-account' },
        'Add Rewards',
      );
  },
);

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const { mockTheme } = jest.requireActual('../../../../../../util/theme');
const mockColors = { icon: { alternative: mockTheme.colors.icon.alternative } };

const createSourceToken = (overrides: Partial<BridgeToken> = {}): BridgeToken =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    image: 'https://example.com/eth.png',
    currencyExchangeRate: 2000,
    balance: '1.0',
    balanceFiat: '$2000.00',
    tokenFiatAmount: 2000,
    ...overrides,
  }) as BridgeToken;

const defaultProps = {
  usdAmount: '',
  sourceToken: createSourceToken(),
  sourceChainId: '0x1' as Hex,
  sourceTokenOptions: [createSourceToken()],
  selectedSourceToken: createSourceToken(),
  isSourcePickerOpen: false,
  setIsSourcePickerOpen: jest.fn(),
  setSelectedSourceToken: jest.fn(),
  sourceBalanceFiat: '$2000.00',
  estimatedPoints: undefined,
  isRewardsLoading: false,
  shouldShowLiveRewardsEstimate: false,
  shouldShowRewardsOptInCta: false,
  shouldShowRewardsFallbackZero: false,
  hasRewardsError: false,
  rewardsAccountScope: null,
  isConfirmDisabled: false,
  isConfirmLoading: false,
  getButtonLabel: () => 'social_leaderboard.trader_position.buy',
  onPresetPress: jest.fn(),
  onConfirm: jest.fn(),
  colors: mockColors,
};

describe('QuickBuyFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('preset buttons', () => {
    it('renders all four presets and calls onPresetPress when tapped', () => {
      const onPresetPress = jest.fn();
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} onPresetPress={onPresetPress} />,
      );

      expect(screen.getByTestId('quick-buy-preset-1')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-20')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-50')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-100')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('quick-buy-preset-50'));
      expect(onPresetPress).toHaveBeenCalledWith('50');
    });
  });

  describe('pay-with row', () => {
    it('renders the SourceTokenPicker when isSourcePickerOpen is true', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} isSourcePickerOpen />,
      );

      expect(screen.getByTestId('mock-source-token-picker')).toBeOnTheScreen();
    });

    it('calls setSelectedSourceToken when a picker option is selected', () => {
      const setSelectedSourceToken = jest.fn();
      const setIsSourcePickerOpen = jest.fn();
      const usdcToken = createSourceToken({ symbol: 'USDC' });

      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          isSourcePickerOpen
          sourceTokenOptions={[createSourceToken(), usdcToken]}
          setSelectedSourceToken={setSelectedSourceToken}
          setIsSourcePickerOpen={setIsSourcePickerOpen}
        />,
      );

      fireEvent.press(screen.getByTestId('picker-option-USDC'));

      expect(setSelectedSourceToken).toHaveBeenCalledWith(usdcToken);
      expect(setIsSourcePickerOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('est. points row', () => {
    it('renders the rewards animation when a live estimate is available', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          shouldShowLiveRewardsEstimate
          estimatedPoints={42}
        />,
      );

      expect(screen.getByTestId('mock-rewards-animation')).toBeOnTheScreen();
      expect(screen.getByText('42 pts')).toBeOnTheScreen();
    });
  });

  describe('buy button', () => {
    it('renders and calls onConfirm when pressed', () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} onConfirm={onConfirm} />,
      );

      expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('quick-buy-confirm-button'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
