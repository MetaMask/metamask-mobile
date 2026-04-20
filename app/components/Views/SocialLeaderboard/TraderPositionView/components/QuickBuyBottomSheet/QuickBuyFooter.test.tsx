import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { Hex } from '@metamask/utils';
import type { AssetType } from '../../../../confirmations/types/token';
import QuickBuyFooter from './QuickBuyFooter';
import { useTransactionPayToken } from '../../../../confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionPayAvailableTokens } from '../../../../confirmations/hooks/pay/useTransactionPayAvailableTokens';

jest.mock('../../../../confirmations/hooks/pay/useTransactionPayToken', () => ({
  useTransactionPayToken: jest.fn(),
}));

jest.mock(
  '../../../../confirmations/hooks/pay/useTransactionPayAvailableTokens',
  () => ({
    useTransactionPayAvailableTokens: jest.fn(),
  }),
);

jest.mock('./SourceTokenPicker', () => {
  const ReactMock = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      options,
      onSelect,
    }: {
      options: AssetType[];
      onSelect: (token: AssetType) => void;
    }) =>
      ReactMock.createElement(
        View,
        { testID: 'mock-source-token-picker' },
        options.map((token: AssetType) =>
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
      ),
  };
});

jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => 0),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const { mockTheme } = jest.requireActual('../../../../../../util/theme');
const mockColors = { icon: { alternative: mockTheme.colors.icon.alternative } };

const createAssetToken = (overrides: Partial<AssetType> = {}): AssetType =>
  ({
    address: '0x0000000000000000000000000000000000000000',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    image: 'https://example.com/eth.png',
    fiat: { balance: 2000 },
    ...overrides,
  }) as AssetType;

const defaultProps = {
  usdAmount: '',
  totalPayUsd: undefined,
  isConfirmDisabled: false,
  isConfirmLoading: false,
  getButtonLabel: () => 'social_leaderboard.trader_position.buy',
  onPresetPress: jest.fn(),
  onConfirm: jest.fn(),
  colors: mockColors,
};

describe('QuickBuyFooter', () => {
  const setPayToken = jest.fn();
  const ethToken = createAssetToken();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTransactionPayToken as jest.Mock).mockReturnValue({
      payToken: {
        address: ethToken.address,
        chainId: ethToken.chainId,
        balanceUsd: '2000',
      },
      setPayToken,
    });
    (useTransactionPayAvailableTokens as jest.Mock).mockReturnValue({
      availableTokens: [ethToken],
      hasTokens: true,
    });
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
    it('shows the source-token picker when the row is tapped', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} />);

      expect(
        screen.queryByTestId('mock-source-token-picker'),
      ).not.toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('quick-buy-pay-with-row'));

      expect(screen.getByTestId('mock-source-token-picker')).toBeOnTheScreen();
    });

    it('calls setPayToken when a picker option is selected', () => {
      const usdcToken = createAssetToken({
        symbol: 'USDC',
        address: '0xA0b86991c6218b36c1D19D4a2e9eb0cE3606eB48' as Hex,
      });
      (useTransactionPayAvailableTokens as jest.Mock).mockReturnValue({
        availableTokens: [ethToken, usdcToken],
        hasTokens: true,
      });

      renderWithProvider(<QuickBuyFooter {...defaultProps} />);

      fireEvent.press(screen.getByTestId('quick-buy-pay-with-row'));
      fireEvent.press(screen.getByTestId('picker-option-USDC'));

      expect(setPayToken).toHaveBeenCalledWith({
        address: usdcToken.address,
        chainId: usdcToken.chainId,
      });
    });
  });

  describe('total row', () => {
    it('shows the Pay-computed totalPayUsd when available', () => {
      renderWithProvider(
        <QuickBuyFooter {...defaultProps} usdAmount="50" totalPayUsd="50.25" />,
      );

      expect(screen.getByText('$50.25')).toBeOnTheScreen();
    });

    it('falls back to the user-entered usdAmount when no quote is available', () => {
      renderWithProvider(<QuickBuyFooter {...defaultProps} usdAmount="42" />);

      expect(screen.getByText('$42')).toBeOnTheScreen();
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
