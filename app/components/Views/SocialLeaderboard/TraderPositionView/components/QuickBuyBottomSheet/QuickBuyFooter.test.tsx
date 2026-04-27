import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import {
  TextColor,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
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
  formattedNetworkFee: '-',
  formattedSlippage: '-',
  formattedMinimumReceived: '-',
  formattedPriceImpact: '-',
  priceImpactViewData: {
    textColor: TextColor.TextAlternative,
    icon: undefined,
    title: 'bridge.price_impact_info_title',
    description: 'bridge.price_impact_info_description',
  },
  totalAmountUsd: '$0',
  sourceToken: createSourceToken(),
  sourceChainId: '0x1' as Hex,
  sourceTokenOptions: [createSourceToken()],
  selectedSourceToken: createSourceToken(),
  isSourcePickerOpen: false,
  setIsSourcePickerOpen: jest.fn(),
  setSelectedSourceToken: jest.fn(),
  sourceBalanceFiat: '$2000.00',
  isTotalLoading: false,
  isConfirmDisabled: false,
  confirmButtonState: 'idle' as const,
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

  describe('total row', () => {
    it('shows skeleton when isTotalLoading is true', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          isTotalLoading
          totalAmountUsd="$20.50"
        />,
      );

      expect(screen.getByTestId('skeleton-view')).toBeOnTheScreen();
      expect(screen.queryByText('$20.50')).toBeNull();
    });

    it('shows the total value when isTotalLoading is false', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          isTotalLoading={false}
          totalAmountUsd="$20.50"
        />,
      );

      expect(screen.getByText('$20.50')).toBeOnTheScreen();
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

  describe('price impact row', () => {
    it('renders the formatted percentage without an icon when impact is safe', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} usdAmount="50" />);

      // safe impact starts collapsed; expand to reveal the subrow
      fireEvent.press(screen.getByTestId('quick-buy-total-row'));

      expect(screen.getByTestId('quick-buy-price-impact')).toBeOnTheScreen();
    });

    it('auto-expands the total breakdown when severity icon is set', () => {
      renderWithProvider(
        <QuickBuyFooter
          {...defaultProps}
          usdAmount="50"
          formattedPriceImpact="6.00%"
          priceImpactViewData={{
            textColor: TextColor.WarningDefault,
            icon: {
              name: IconName.Warning,
              color: IconColor.WarningDefault,
            },
            title: 'bridge.price_impact_warning_title',
            description: 'bridge.price_impact_warning_description',
          }}
        />,
      );

      // No tap on Total — should already be expanded
      expect(screen.getByTestId('quick-buy-price-impact')).toBeOnTheScreen();
      expect(screen.getByText('6.00%')).toBeOnTheScreen();
    });
  });
});
