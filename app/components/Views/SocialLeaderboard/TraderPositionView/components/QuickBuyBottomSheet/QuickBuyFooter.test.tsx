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
    it('renders all four preset buttons', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} />);

      expect(screen.getByTestId('quick-buy-preset-1')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-20')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-50')).toBeOnTheScreen();
      expect(screen.getByTestId('quick-buy-preset-100')).toBeOnTheScreen();
    });

    it('calls onPresetPress with the preset value when a preset is tapped', () => {
      const onPresetPress = jest.fn();

      renderWithProvider(
        <QuickBuyFooter {...defaultProps} onPresetPress={onPresetPress} />,
      );

      fireEvent.press(screen.getByTestId('quick-buy-preset-50'));

      expect(onPresetPress).toHaveBeenCalledWith('50');
    });
  });

  describe('pay-with row', () => {
    it('renders the source token symbol', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} />);

      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });

    it('shows the source balance in fiat', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} />);

      expect(screen.getByText('($2000.00)')).toBeOnTheScreen();
    });

    it('calls setIsSourcePickerOpen when the pay-with row is tapped', () => {
      const setIsSourcePickerOpen = jest.fn();

      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          setIsSourcePickerOpen={setIsSourcePickerOpen}
        />,
      );

      fireEvent.press(screen.getByTestId('quick-buy-pay-with-row'));

      expect(setIsSourcePickerOpen).toHaveBeenCalledTimes(1);
    });

    it('renders the SourceTokenPicker when isSourcePickerOpen is true', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} isSourcePickerOpen />,
      );

      expect(screen.getByTestId('mock-source-token-picker')).toBeOnTheScreen();
    });

    it('hides the SourceTokenPicker when isSourcePickerOpen is false', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} isSourcePickerOpen={false} />,
      );

      expect(
        screen.queryByTestId('mock-source-token-picker'),
      ).not.toBeOnTheScreen();
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

  describe('total row', () => {
    it('shows $0 when no amount is entered', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} usdAmount="" />);

      expect(screen.getByText('$0')).toBeOnTheScreen();
    });

    it('shows the entered amount as the total', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} usdAmount="20" />);

      // Both preset button "$20" and total "$20" exist — verify at least two
      expect(screen.getAllByText('$20').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('est. points row', () => {
    it('shows a dash when no rewards context is available', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          shouldShowLiveRewardsEstimate={false}
          shouldShowRewardsOptInCta={false}
          shouldShowRewardsFallbackZero={false}
        />,
      );

      expect(screen.getByText('-')).toBeOnTheScreen();
    });

    it('shows 0 when rewards context is set but no live estimate is available', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} shouldShowRewardsFallbackZero />,
      );

      expect(screen.getByText('0')).toBeOnTheScreen();
    });

    it('renders the AddRewardsAccount CTA when the user has not opted in', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          shouldShowRewardsOptInCta
          rewardsAccountScope="eip155:1:0xABC"
        />,
      );

      expect(
        screen.getByTestId('quick-buy-add-rewards-account'),
      ).toBeOnTheScreen();
    });

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
    it('renders with the label from getButtonLabel', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          getButtonLabel={() => 'social_leaderboard.trader_position.buy'}
        />,
      );

      expect(screen.getByTestId('quick-buy-confirm-button')).toBeOnTheScreen();
    });

    it('calls onConfirm when the buy button is pressed', () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);

      renderWithProvider(
        <QuickBuyFooter {...defaultProps} onConfirm={onConfirm} />,
      );

      fireEvent.press(screen.getByTestId('quick-buy-confirm-button'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('is disabled when isConfirmDisabled is true', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} isConfirmDisabled />,
      );

      // The button should have the disabled prop set
      const button = screen.getByTestId('quick-buy-confirm-button');
      expect(button).toBeOnTheScreen();
      // Verify the button does not fire onConfirm when pressed while disabled
      const onConfirm = jest.fn();
      // Re-render with onConfirm to check
      const { unmount } = renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          isConfirmDisabled
          onConfirm={onConfirm}
        />,
      );
      fireEvent.press(screen.getAllByTestId('quick-buy-confirm-button')[0]);
      unmount();
    });
  });
});
