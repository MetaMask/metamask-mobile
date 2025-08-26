import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AssetType, TokenStandard } from '../../../types/token';
import { Amount } from './amount';
import { getFontSizeForInputLength } from './amount.styles';

const mockUpdateValue = jest.fn();
const mockSetAmountInputMethodManual = jest.fn();
const mockSetAmountInputTypeFiat = jest.fn();
const mockSetAmountInputTypeToken = jest.fn();

const mockERC20Asset = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  decimals: 18,
  name: 'Test Token',
  symbol: 'TEST',
  ticker: 'TEST',
  standard: TokenStandard.ERC20,
} as unknown as AssetType;

const mockNFTAsset = {
  address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
  chainId: 1,
  name: 'Test NFT',
  tokenId: '17',
  standard: TokenStandard.ERC1155,
} as unknown as AssetType;

jest.mock('../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../hooks/send/useBalance', () => ({
  useBalance: () => ({
    balance: '10',
  }),
}));

jest.mock('../../../hooks/send/useAmountValidation', () => ({
  useAmountValidation: jest.fn(),
}));

jest.mock('../../../hooks/send/useCurrencyConversions', () => ({
  useCurrencyConversions: () => ({
    fiatCurrencySymbol: '$',
    getFiatDisplayValue: (amount: string) => {
      const num = parseFloat(amount);
      return isNaN(num) ? '$0.00' : `$${(num * 2500).toFixed(2)}`;
    },
    getNativeDisplayValue: (amount: string) => {
      const num = parseFloat(amount);
      return isNaN(num) ? '0.000000 TEST' : `${(num / 2500).toFixed(6)} TEST`;
    },
    getNativeValue: (amount: string) => {
      const num = parseFloat(amount);
      return isNaN(num) ? '0' : (num / 2500).toString();
    },
  }),
}));

jest.mock('../../../hooks/send/metrics/useAmountSelectionMetrics', () => ({
  useAmountSelectionMetrics: () => ({
    setAmountInputMethodManual: mockSetAmountInputMethodManual,
    setAmountInputTypeFiat: mockSetAmountInputTypeFiat,
    setAmountInputTypeToken: mockSetAmountInputTypeToken,
  }),
}));

jest.mock('../../../hooks/send/useRouteParams', () => ({
  useRouteParams: jest.fn(),
}));

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      topSection: {},
      nftImageWrapper: {},
      nftImage: {},
      inputSection: {},
      inputWrapper: {},
      input: {},
      tokenSymbol: {},
      currencyTag: {},
      balanceSection: {},
    },
    theme: {
      colors: {
        primary: {
          default: '#037DD6',
        },
      },
    },
  }),
}));

jest.mock('../../../../../UI/CollectibleMedia', () => 'CollectibleMedia');

jest.mock('./amount-keyboard', () => ({
  AmountKeyboard: ({
    updateAmount,
    amount,
  }: {
    updateAmount: (amount: string) => void;
    amount: string;
  }) => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return (
      <Pressable
        testID="amount_keyboard"
        onPress={() => updateAmount(amount + '1')}
      >
        <Text>Amount Keyboard</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: { [key: string]: string } = {
      'send.units': 'units',
      'send.available': 'available',
    };
    return translations[key] || key;
  },
}));

const renderComponent = (
  primaryCurrency = 'ETH',
  asset: AssetType = mockERC20Asset,
  amountError: string | null = null,
) => {
  const mockUseSendContext = jest.requireMock(
    '../../../context/send-context',
  ).useSendContext;
  const mockUseAmountValidation = jest.requireMock(
    '../../../hooks/send/useAmountValidation',
  ).useAmountValidation;

  mockUseSendContext.mockReturnValue({
    asset,
    updateValue: mockUpdateValue,
  });

  mockUseAmountValidation.mockReturnValue({
    amountError,
  });

  return renderWithProvider(<Amount />, {
    state: {
      settings: {
        primaryCurrency,
      },
    },
  });
};

describe('Amount Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with ERC20 token', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('send_amount')).toBeTruthy();
    expect(getByText('TEST')).toBeTruthy();
    expect(getByText('10 TEST available')).toBeTruthy();
  });

  it('renders correctly with NFT asset', () => {
    const { getByText, queryByTestId } = renderComponent('ETH', {
      ...mockNFTAsset,
      decimals: 0,
      symbol: 'NFT',
      ticker: 'NFT',
    });

    expect(getByText('Test NFT')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
    expect(queryByTestId('fiat_toggle')).toBeNull();
  });

  it('uses `NFT` in place of asset symbol if symbol is not present', () => {
    const { getByText, queryByTestId } = renderComponent('ETH', mockNFTAsset);

    expect(getByText('NFT')).toBeTruthy();
    expect(getByText('Test NFT')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
    expect(getByText('10 units available')).toBeTruthy();
    expect(queryByTestId('fiat_toggle')).toBeNull();
  });

  it('starts in fiat mode when primary currency is Fiat', () => {
    const { getByText } = renderComponent('Fiat');

    expect(getByText('$')).toBeTruthy();
  });

  it('starts in native mode when primary currency is ETH', () => {
    const { getByText } = renderComponent('ETH');

    expect(getByText('TEST')).toBeTruthy();
  });

  it('handles amount input correctly', () => {
    const { getByTestId } = renderComponent();

    const input = getByTestId('send_amount');
    fireEvent.changeText(input, '1.5');

    expect(mockUpdateValue).toHaveBeenCalledWith('1.5');
    expect(mockSetAmountInputMethodManual).toHaveBeenCalled();
  });

  it('converts to native value when in fiat mode', () => {
    const { getByTestId } = renderComponent('Fiat');

    const input = getByTestId('send_amount');
    fireEvent.changeText(input, '100');

    expect(mockUpdateValue).toHaveBeenCalledWith('0.04');
  });

  it('toggles fiat mode correctly', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('fiat_toggle'));

    expect(mockSetAmountInputTypeToken).toHaveBeenCalled();
    expect(mockUpdateValue).toHaveBeenCalledWith('');
  });

  it('toggles from fiat to native mode', () => {
    const { getByTestId } = renderComponent('Fiat');

    fireEvent.press(getByTestId('fiat_toggle'));

    expect(mockSetAmountInputTypeFiat).toHaveBeenCalled();
    expect(mockUpdateValue).toHaveBeenCalledWith('');
  });

  it('displays alternate currency value in native mode', () => {
    const { getByTestId, getByText } = renderComponent();

    const input = getByTestId('send_amount');
    fireEvent.changeText(input, '1');

    expect(getByText('$2500.00')).toBeTruthy();
  });

  it('displays alternate currency value in fiat mode', () => {
    const { getByTestId, getByText } = renderComponent('Fiat');

    const input = getByTestId('send_amount');
    fireEvent.changeText(input, '100');

    expect(getByText('0.040000 TEST')).toBeTruthy();
  });

  it('does not show fiat toggle for NFTs', () => {
    const { queryByTestId } = renderComponent('ETH', {
      ...mockNFTAsset,
      decimals: 0,
      symbol: 'NFT',
      ticker: 'NFT',
    });

    expect(queryByTestId('fiat_toggle')).toBeNull();
  });

  it('prefers ticker over symbol', () => {
    const assetWithOne = {
      ...mockERC20Asset,
      symbol: 'SYM',
      ticker: undefined,
    };
    let result = renderComponent('ETH', assetWithOne);
    expect(result.getByText('SYM')).toBeTruthy();

    const assetWithBoth = { ...mockERC20Asset, symbol: 'SYM', ticker: 'TICK' };
    result = renderComponent('ETH', assetWithBoth);
    expect(result.getByText('TICK')).toBeTruthy();
  });

  it('clears amount when toggling currency mode', () => {
    const { getByTestId } = renderComponent();

    const input = getByTestId('send_amount');
    fireEvent.changeText(input, '1.5');
    fireEvent.press(getByTestId('fiat_toggle'));

    expect(mockUpdateValue).toHaveBeenLastCalledWith('');
  });

  it('passes correct props to AmountKeyboard', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('amount_keyboard')).toBeTruthy();
  });
});

describe('getFontSizeForInputLength', () => {
  it('return correct font size for character length', () => {
    expect(getFontSizeForInputLength(5)).toEqual(60);
    expect(getFontSizeForInputLength(8)).toEqual(60);
    expect(getFontSizeForInputLength(12)).toEqual(32);
    expect(getFontSizeForInputLength(15)).toEqual(32);
    expect(getFontSizeForInputLength(20)).toEqual(24);
    expect(getFontSizeForInputLength(25)).toEqual(18);
    expect(getFontSizeForInputLength(30)).toEqual(18);
  });
});
