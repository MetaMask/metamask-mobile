import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

import renderWithProvider, {
  ProviderValues,
} from '../../../../../../util/test/renderWithProvider';
import {
  SOLANA_ASSET,
  TOKEN_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../../__mocks__/send.mock';
import { SendContextProvider } from '../../../context/send-context';
import { Amount } from './amount';

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

  it('on amount page options - 25%, 50%, Max are present', () => {
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
    expect(getByText('Max')).toBeTruthy();
    expect(getByText('Done')).toBeTruthy();
  });

  it('on amount page options optionMax is not visible for non-evm native tokens', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: SOLANA_ASSET,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, queryByText } = renderComponent();
    expect(getByText('25%')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('Done')).toBeTruthy();
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
    fireEvent.press(getByText('50%'));
    expect(getByTestId('send_amount').props.value).toBe('0.02');
    fireEvent.press(getByText('25%'));
    expect(getByTestId('send_amount').props.value).toBe('0.01');
  });

  it('pressing percentage buttons uses correct value for native token', () => {
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
          address: TOKEN_ADDRESS_MOCK_1,
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
    fireEvent.press(getByText('Done'));
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
    fireEvent.press(getByText('Done'));
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
    fireEvent.press(getByText('Done'));
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('navigate to next page when continue button is clicked', () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '.01');
    fireEvent.press(getByText('Done'));
    fireEvent.press(getByText('Continue'));
    expect(mockNavigate).toHaveBeenCalled();
  });
});
