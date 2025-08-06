import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

import renderWithProvider, {
  ProviderValues,
} from '../../../../../../util/test/renderWithProvider';
import { SendContextProvider } from '../../../context/send-context';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  TOKEN_ADDRESS_MOCK_1,
  evmSendStateMock,
} from '../../../__mocks__/send.mock';
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
    const { getByText } = renderComponent();

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('Value:')).toBeTruthy();
  });

  it('use from address returned from SendContext', async () => {
    const { getByText } = renderComponent();

    expect(getByText('From:')).toBeTruthy();
    expect(getByText(ACCOUNT_ADDRESS_MOCK_1)).toBeTruthy();
  });

  it('display error for invalid amount value', async () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), 'abc');
    expect(getByText('Invalid amount')).toBeTruthy();
  });

  it('display error if amount is greater than balance for native token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          isNative: true,
          chainId: '0x1',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '100');
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('display error if amount is greater than balance for ERC20 token', async () => {
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

  it('asset passed in nav params should be used if present', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = renderComponent();
    expect(getByText(`Asset: ${TOKEN_ADDRESS_MOCK_1}`)).toBeTruthy();
  });

  it('pressing Max uses max balance of ERC20 token', () => {
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
    expect(getByText('$ 0.05')).toBeTruthy();
  });

  it('pressing Max uses max balance minus gas for native token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          isNative: true,
          chainId: '0x1',
          address: TOKEN_ADDRESS_MOCK_1,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe('0.9999685');
    expect(getByText('$ 3889.87')).toBeTruthy();
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
    expect(getByText('$ 3890')).toBeTruthy();
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

  it('navigate to next page when continue button is clicked', () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '100');
    fireEvent.press(getByText('Continue'));
    expect(mockNavigate).toHaveBeenCalled();
  });
});
