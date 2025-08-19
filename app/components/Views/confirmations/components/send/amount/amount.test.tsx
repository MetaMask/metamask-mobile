import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

import renderWithProvider, {
  ProviderValues,
} from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  ETHEREUM_ADDRESS,
  SOLANA_ASSET,
  TOKEN_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../../__mocks__/send.mock';
// eslint-disable-next-line import/no-namespace
import * as AmountSelectionMetrics from '../../../hooks/send/metrics/useAmountSelectionMetrics';
import { SendContextProvider } from '../../../context/send-context';
import { useSendNavbar } from '../../../hooks/send/useSendNavbar';
import { Amount } from './amount';

jest.mock('../../../hooks/send/useSendNavbar', () => ({
  useSendNavbar: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    AssetsContractController: {
      getERC721AssetSymbol: Promise.resolve(undefined),
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

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      },
    },
  }),
}));

const renderComponent = (mockState?: ProviderValues['state']) => {
  const state = mockState
    ? merge(evmSendStateMock, mockState)
    : evmSendStateMock;
  return renderWithProvider(
    <SendContextProvider>
      <Amount />
    </SendContextProvider>,
    {
      state,
    },
  );
};

describe('Amount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('send_amount')).toBeTruthy();
  });

  it('calls useSendNavbar with correct currentRoute', () => {
    renderComponent();

    expect(useSendNavbar).toHaveBeenCalledWith({
      currentRoute: Routes.SEND.AMOUNT,
    });
  });

  it('asset passed in nav params should be used if present', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
          ticker: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = renderComponent();
    expect(getByText('ETH')).toBeTruthy();
  });

  it('display fiat conversion of amount entered', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '1');
    expect(getByText('$ 3890.00')).toBeTruthy();
  });

  it('display fiat conversion of amount entered for solana asset', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: SOLANA_ASSET,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '1');
    expect(getByText('$ 175.00')).toBeTruthy();
  });

  it('if fiatmode is enabled display native conversion of amount entered', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.press(getByTestId('fiat_toggle'));
    fireEvent.changeText(getByTestId('send_amount'), '7780');
    expect(getByText('ETH 2')).toBeTruthy();
  });

  it('calls metrics methods on changing fiat mode', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const mockSetAmountInputTypeFiat = jest.fn();
    const mockSetAmountInputTypeToken = jest.fn();
    jest
      .spyOn(AmountSelectionMetrics, 'useAmountSelectionMetrics')
      .mockReturnValue({
        setAmountInputTypeFiat: mockSetAmountInputTypeFiat,
        setAmountInputTypeToken: mockSetAmountInputTypeToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const { getByTestId } = renderComponent();
    fireEvent.press(getByTestId('fiat_toggle'));
    expect(mockSetAmountInputTypeToken).toHaveBeenCalled();
    fireEvent.press(getByTestId('fiat_toggle'));
    expect(mockSetAmountInputTypeFiat).toHaveBeenCalled();
  });

  it('display total balance correctly for native token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          isNative: true,
          chainId: '0x1',
          address: TOKEN_ADDRESS_MOCK_1,
          ticker: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText } = renderComponent();
    expect(getByText('1.00000 ETH available')).toBeTruthy();
  });

  it('display total balance correctly for ERC20 token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          decimals: 2,
          symbol: 'TKN',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText } = renderComponent();
    expect(getByText('0.05 TKN available')).toBeTruthy();
  });

  it('display total balance correctly for non-evm token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: SOLANA_ASSET,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText } = renderComponent();
    expect(getByText('400.00000 SOL available')).toBeTruthy();
  });

  it('on amount page options - 25%, 50%, 75%, Max are present', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText } = renderComponent();
    expect(getByText('25%')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
    expect(getByText('Max')).toBeTruthy();
  });

  it('percentage options are not present as amount value is entered', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText } = renderComponent();
    expect(getByText('25%')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
    expect(getByText('Max')).toBeTruthy();
  });

  it('on amount page options optionMax is not visible for non-evm native tokens', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: SOLANA_ASSET,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByTestId, queryByText } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '1');
    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('75%')).toBeNull();
    expect(queryByText('Max')).toBeNull();
  });

  it('pressing percentage buttons uses correct value of ERC20 token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe('0.05');
    fireEvent.changeText(getByTestId('send_amount'), '');
    fireEvent.press(getByText('75%'));
    expect(getByTestId('send_amount').props.value).toBe('0.03');
    fireEvent.changeText(getByTestId('send_amount'), '');
    fireEvent.press(getByText('50%'));
    expect(getByTestId('send_amount').props.value).toBe('0.02');
    fireEvent.changeText(getByTestId('send_amount'), '');
    fireEvent.press(getByText('25%'));
    expect(getByTestId('send_amount').props.value).toBe('0.01');
  });

  it('pressing percentage buttons uses correct value for native token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          isNative: true,
          chainId: '0x1',
          address: ETHEREUM_ADDRESS,
          ticker: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe('0.9999685');
    expect(getByText('$ 3889.87')).toBeTruthy();
    fireEvent.press(getByText('1.00000 ETH available'));
  });

  it('pressing Max in fiat mode should work as expected', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByTestId('fiat_toggle'));
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe('3889.87746');
    expect(getByText('ETH 0.99997')).toBeTruthy();
  });

  it('pressing Max calls metrics function setAmountInputMethodPressedMax', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
          isNative: true,
          chainId: '0x1',
          symbol: 'ETH',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const mockSetAmountInputMethodPressedMax = jest.fn();
    const mockSetAmountInputTypeToken = jest.fn();
    jest
      .spyOn(AmountSelectionMetrics, 'useAmountSelectionMetrics')
      .mockReturnValue({
        setAmountInputMethodPressedMax: mockSetAmountInputMethodPressedMax,
        setAmountInputTypeToken: mockSetAmountInputTypeToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByTestId('fiat_toggle'));
    fireEvent.press(getByText('Max'));
    expect(mockSetAmountInputTypeToken).toHaveBeenCalled();
    expect(mockSetAmountInputMethodPressedMax).toHaveBeenCalled();
  });

  it('continue button show error text in case of insufficient balance for erc20 token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '100');
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('continue button show error text in case of insufficient balance for solana token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: SOLANA_ASSET,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '1000');
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('continue button show error text in case of insufficient balance for native token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: TOKEN_ADDRESS_MOCK_1,
          isNative: true,
          chainId: '0x1',
          ticker: 'ETH',
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '100');
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('navigate to next page when continue button is clicked', () => {
    const { getByText, getByTestId, queryByText } = renderComponent();
    expect(queryByText('Continue')).toBeNull();
    fireEvent.changeText(getByTestId('send_amount'), '.01');
    fireEvent.press(getByText('Continue'));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('call metrics function captureAmountSelected when continue is pressed', () => {
    const mockCaptureAmountSelected = jest.fn();
    jest
      .spyOn(AmountSelectionMetrics, 'useAmountSelectionMetrics')
      .mockReturnValue({
        captureAmountSelected: mockCaptureAmountSelected,
        setAmountInputMethodManual: jest.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '.01');
    fireEvent.press(getByText('Continue'));
    expect(mockCaptureAmountSelected).toHaveBeenCalled();
  });
});
