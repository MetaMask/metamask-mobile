import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

import renderWithProvider, {
  ProviderValues,
} from '../../../../../../util/test/renderWithProvider';
import {
  ETHEREUM_ADDRESS,
  MOCK_NFT1155,
  SOLANA_ASSET,
  TOKEN_ADDRESS_MOCK_1,
  evmSendStateMock,
  solanaSendStateMock,
} from '../../../__mocks__/send.mock';
import { useAmountSelectionMetrics } from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { useCurrencyConversions } from '../../../hooks/send/useCurrencyConversions';
import { useSendContext } from '../../../context/send-context';
import { Amount } from './amount';
import { getFontSizeForInputLength } from './amount.styles';

jest.mock('../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../hooks/send/useCurrencyConversions');

jest.mock('../../../hooks/send/useRouteParams');

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    AssetsContractController: {
      getERC721AssetSymbol: () => Promise.resolve(undefined),
    },
    CurrencyRateController: {
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionRate: 2000,
          conversionDate: Date.now(),
        },
      },
    },
  },
}));

jest.mock(
  '../../../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
  () => ({
    useGasFeeEstimates: () => ({
      gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
    }),
  }),
);

jest.mock('../../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

jest.mock('../../../hooks/send/metrics/useAmountSelectionMetrics', () => ({
  useAmountSelectionMetrics: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn(),
}));

const mockedUseAmountSelectionMetrics = jest.mocked(useAmountSelectionMetrics);
const mockUseCurrencyConversion = jest.mocked(useCurrencyConversions);
const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;
const mockAmountSelectionMetrics = {
  captureAmountSelected: jest.fn(),
  setAmountInputMethodManual: jest.fn(),
  setAmountInputMethodPressedMax: jest.fn(),
  setAmountInputTypeFiat: jest.fn(),
  setAmountInputTypeToken: jest.fn(),
};

const renderComponent = (mockState?: ProviderValues['state']) => {
  const state = mockState
    ? merge(evmSendStateMock, mockState)
    : evmSendStateMock;

  return renderWithProvider(<Amount />, { state });
};

describe('Amount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAmountSelectionMetrics.mockReturnValue(mockAmountSelectionMetrics);
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: ETHEREUM_ADDRESS,
        isNative: true,
        symbol: 'ETH',
        decimals: 18,
      },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);
    mockUseCurrencyConversion.mockReturnValue({
      conversionSupportedForAsset: true,
      fiatCurrencySymbol: 'USD',
      getFiatValue: '4500',
      getFiatDisplayValue: () => '$ 4500.00',
      getNativeValue: () => '1',
    } as unknown as ReturnType<typeof useCurrencyConversions>);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('send_amount')).toBeTruthy();
  });

  it('display default value of amount as placeholder', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('send_amount').children[0]).toEqual('0');
    fireEvent.press(getByTestId('fiat_toggle'));
    expect(getByTestId('send_amount').children[0]).toEqual('0.00');
  });

  it('asset passed in nav params should be used if present', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Ethereum',
        address: TOKEN_ADDRESS_MOCK_1,
        ticker: 'ETH',
      },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent();
    expect(getByText('ETH')).toBeTruthy();
  });

  it('display fiat conversion of amount entered', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Ethereum',
        address: ETHEREUM_ADDRESS,
        isNative: true,
        chainId: '0x1',
        symbol: 'ETH',
        decimals: 18,
      },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole, getByText } = renderComponent();
    fireEvent.press(getByRole('button', { name: '1' }));
    expect(getByText('$ 4500.00')).toBeTruthy();
  });

  it('display fiat conversion of amount entered for solana asset', () => {
    mockUseCurrencyConversion.mockReturnValue({
      conversionSupportedForAsset: true,
      fiatConversionRate: 10,
      fiatCurrencySymbol: 'USD',
      getFiatValue: '250',
      getFiatDisplayValue: () => '$ 250.00',
      getNativeValue: () => '1',
    } as unknown as ReturnType<typeof useCurrencyConversions>);

    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole, getByText } = renderComponent();
    fireEvent.press(getByRole('button', { name: '1' }));
    expect(getByText('$ 250.00')).toBeTruthy();
  });

  it('if fiatmode is enabled display native conversion of amount entered', () => {
    mockUseCurrencyConversion.mockReturnValue({
      conversionSupportedForAsset: true,
      fiatConversionRate: 10,
      fiatCurrencySymbol: 'USD',
      getFiatValue: () => '250',
      getFiatDisplayValue: () => '$ 250.00',
      getNativeValue: () => '1',
    } as unknown as ReturnType<typeof useCurrencyConversions>);

    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Ethereum',
        address: ETHEREUM_ADDRESS,
        isNative: true,
        chainId: '0x1',
        symbol: 'ETH',
        decimals: 18,
        rawBalance: '0x5',
      },
      updateValue: jest.fn(),
      value: '1',
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole, getByText, getByTestId } = renderComponent();
    fireEvent.press(getByTestId('fiat_toggle'));
    fireEvent.press(getByRole('button', { name: '5' }));
    expect(getByText('1 ETH')).toBeTruthy();
  });

  it('calls metrics methods on changing fiat mode', () => {
    const mockSetAmountInputTypeFiat = jest.fn();
    const mockSetAmountInputTypeToken = jest.fn();

    mockedUseAmountSelectionMetrics.mockReturnValue({
      ...mockAmountSelectionMetrics,
      setAmountInputTypeFiat: mockSetAmountInputTypeFiat,
      setAmountInputTypeToken: mockSetAmountInputTypeToken,
    });

    mockUseSendContext.mockReturnValue({
      asset: {
        name: 'Ethereum',
        address: ETHEREUM_ADDRESS,
        isNative: true,
        chainId: '0x1',
        symbol: 'ETH',
        decimals: 18,
      },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByTestId } = renderComponent();
    fireEvent.press(getByTestId('fiat_toggle'));
    expect(mockSetAmountInputTypeFiat).toHaveBeenCalled();
    fireEvent.press(getByTestId('fiat_toggle'));
    expect(mockSetAmountInputTypeToken).toHaveBeenCalled();
  });

  it('fiatmode toggling is not avaialble is conversion rate is not available for asset', () => {
    mockUseCurrencyConversion.mockReturnValue({
      conversionSupportedForAsset: false,
      fiatCurrencySymbol: 'USD',
      getFiatValue: '4500',
      getFiatDisplayValue: () => '$ 4500.00',
      getNativeValue: () => '1',
    } as unknown as ReturnType<typeof useCurrencyConversions>);

    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { queryByTestId } = renderComponent();
    expect(queryByTestId('fiat_toggle')).toBeNull();
  });

  it('display image and NFT details for NFT asset', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByTestId, getByText } = renderComponent();
    expect(getByTestId('nft-image')).toBeTruthy();
    expect(getByText('Doodleverse (Draw Me Closer) Pack')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
  });

  // it('display total balance correctly for ERC20 token', () => {
  //   mockUseRoute.mockReturnValue({
  //     params: {
  //       asset: {
  //         address: TOKEN_ADDRESS_MOCK_1,
  //         decimals: 2,
  //         symbol: 'TKN',
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText } = renderComponent();
  //   expect(getByText('0.05 TKN available')).toBeTruthy();
  // });

  it('display total balance correctly for non-evm token', () => {
    mockUseSendContext.mockReturnValue({
      asset: { ...SOLANA_ASSET, rawBalance: '0x17D78400', decimals: 6 },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent(solanaSendStateMock);
    expect(getByText('400 SOL available')).toBeTruthy();
  });

  it('on amount page options - 25%, 50%, 75%, Max are present', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        address: TOKEN_ADDRESS_MOCK_1,
        decimals: 2,
        symbol: 'TKN',
      },
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent();
    expect(getByText('25%')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
    expect(getByText('Max')).toBeTruthy();
  });

  it('percentage options are not present as amount value is entered', () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole, queryByText } = renderComponent();
    fireEvent.press(getByRole('button', { name: '1' }));
    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('75%')).toBeNull();
    expect(queryByText('Max')).toBeNull();
  });

  it('percentage options are not present for NFT send', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText, queryByText } = renderComponent();
    expect(getByText('Next')).toBeTruthy();
    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('75%')).toBeNull();
    expect(queryByText('Max')).toBeNull();
  });

  it('on amount page options optionMax is not visible for non-evm native tokens', () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
      updateValue: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { queryByText } = renderComponent(solanaSendStateMock);
    expect(queryByText('25%')).toBeTruthy();
    expect(queryByText('50%')).toBeTruthy();
    expect(queryByText('75%')).toBeTruthy();
    expect(queryByText('Max')).toBeNull();
  });

  it('show error in case of insufficient balance for ERC1155 token', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
      updateValue: jest.fn(),
      value: '10',
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent();
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  // it('pressing percentage buttons uses correct value of ERC20 token', () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         address: TOKEN_ADDRESS_MOCK_1,
  //         decimals: 2,
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   expect(getByTestId('send_amount').props.value).toBe('');
  //   fireEvent.press(getByText('Max'));
  //   expect(getByTestId('send_amount').props.value).toBe('0.05');
  //   fireEvent.changeText(getByTestId('send_amount'), '');
  //   fireEvent.press(getByText('75%'));
  //   expect(getByTestId('send_amount').props.value).toBe('0.03');
  //   fireEvent.changeText(getByTestId('send_amount'), '');
  //   fireEvent.press(getByText('50%'));
  //   expect(getByTestId('send_amount').props.value).toBe('0.02');
  //   fireEvent.changeText(getByTestId('send_amount'), '');
  //   fireEvent.press(getByText('25%'));
  //   expect(getByTestId('send_amount').props.value).toBe('0.01');
  // });

  // it('pressing percentage buttons uses correct value for native token', () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         isNative: true,
  //         chainId: '0x1',
  //         address: ETHEREUM_ADDRESS,
  //         ticker: 'ETH',
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   expect(getByTestId('send_amount').props.value).toBe('');
  //   fireEvent.press(getByText('Max'));
  //   expect(getByTestId('send_amount').props.value).toBe('0.9999685');
  //   expect(getByText('$ 3889.87')).toBeTruthy();
  //   fireEvent.press(getByText('1 ETH available'));
  // });

  // it('pressing Max in fiat mode should work as expected', () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         name: 'Ethereum',
  //         address: ETHEREUM_ADDRESS,
  //         isNative: true,
  //         chainId: '0x1',
  //         symbol: 'ETH',
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   expect(getByTestId('send_amount').props.value).toBe('');
  //   fireEvent.press(getByTestId('fiat_toggle'));
  //   fireEvent.press(getByText('Max'));
  //   expect(getByTestId('send_amount').props.value).toBe('3889.87746');
  //   expect(getByText('ETH 0.99997')).toBeTruthy();
  // });

  // it('pressing Max calls metrics function setAmountInputMethodPressedMax', () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         name: 'Ethereum',
  //         address: TOKEN_ADDRESS_MOCK_1,
  //         isNative: true,
  //         chainId: '0x1',
  //         symbol: 'ETH',
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);
  //   const mockSetAmountInputMethodPressedMax = jest.fn();
  //   const mockSetAmountInputTypeToken = jest.fn();
  //   jest
  //     .spyOn(AmountSelectionMetrics, 'useAmountSelectionMetrics')
  //     .mockReturnValue({
  //       setAmountInputMethodPressedMax: mockSetAmountInputMethodPressedMax,
  //       setAmountInputTypeToken: mockSetAmountInputTypeToken,
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     } as any);

  //   const { getByText, getByTestId } = renderComponent();
  //   expect(getByTestId('send_amount').props.value).toBe('');
  //   fireEvent.press(getByTestId('fiat_toggle'));
  //   fireEvent.press(getByText('Max'));
  //   expect(mockSetAmountInputTypeToken).toHaveBeenCalled();
  //   expect(mockSetAmountInputMethodPressedMax).toHaveBeenCalled();
  // });

  // // todo: update this test case once we have way to get asset balance for ERC1155 tokens
  // it('does not show error in case of insufficient balance for ERC1155 token', async () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: MOCK_NFT1155,
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { queryByText, getByTestId } = renderComponent();
  //   fireEvent.changeText(getByTestId('send_amount'), '100');
  //   expect(queryByText('Insufficient funds')).toBeNull();

  // });

  // it('continue button show error text in case of insufficient balance for erc20 token', async () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         address: TOKEN_ADDRESS_MOCK_1,
  //         decimals: 2,
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   fireEvent.changeText(getByTestId('send_amount'), '100');
  //   expect(getByText('Insufficient funds')).toBeTruthy();
  // });

  // it('continue button show error text in case of insufficient balance for solana token', async () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: SOLANA_ASSET,
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   fireEvent.changeText(getByTestId('send_amount'), '1000');
  //   expect(getByText('Insufficient funds')).toBeTruthy();
  // });

  // it('continue button show error text in case of insufficient balance for native token', async () => {
  //   (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
  //     params: {
  //       asset: {
  //         address: TOKEN_ADDRESS_MOCK_1,
  //         isNative: true,
  //         chainId: '0x1',
  //         ticker: 'ETH',
  //         decimals: 2,
  //       },
  //     },
  //   } as RouteProp<ParamListBase, string>);

  //   const { getByText, getByTestId } = renderComponent();
  //   fireEvent.changeText(getByTestId('send_amount'), '100');
  //   expect(getByText('Insufficient funds')).toBeTruthy();
  // });

  // it('navigate to next page when continue button is clicked', () => {
  //   const { getByText, getByTestId, queryByText } = renderComponent();
  //   expect(queryByText('Continue')).toBeNull();
  //   fireEvent.changeText(getByTestId('send_amount'), '.01');
  //   fireEvent.press(getByText('Continue'));
  //   expect(mockNavigate).toHaveBeenCalled();
  // });

  // it('call metrics function captureAmountSelected when continue is pressed', () => {
  //   const mockCaptureAmountSelected = jest.fn();
  //   jest
  //     .spyOn(AmountSelectionMetrics, 'useAmountSelectionMetrics')
  //     .mockReturnValue({
  //       captureAmountSelected: mockCaptureAmountSelected,
  //       setAmountInputMethodManual: jest.fn(),
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     } as any);

  //   const { getByText, getByTestId } = renderComponent();
  //   fireEvent.changeText(getByTestId('send_amount'), '.01');
  //   fireEvent.press(getByText('Continue'));
  //   expect(mockCaptureAmountSelected).toHaveBeenCalled();
  // });
});

describe('getFontSizeForInputLength', () => {
  it('renders correct font size using input and symbol length', () => {
    expect(getFontSizeForInputLength(1)).toEqual(60);
    expect(getFontSizeForInputLength(10)).toEqual(60);
    expect(getFontSizeForInputLength(12)).toEqual(48);
    expect(getFontSizeForInputLength(18)).toEqual(32);
    expect(getFontSizeForInputLength(24)).toEqual(24);
    expect(getFontSizeForInputLength(32)).toEqual(18);
    expect(getFontSizeForInputLength(40)).toEqual(12);
  });
});
