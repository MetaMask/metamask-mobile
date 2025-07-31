import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { act, fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../../util/transaction-controller';
import { SendContextProvider } from '../../context/send-context';
import { Send } from './send';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
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
  '../../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
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
      },
    },
  }),
}));

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <Send />
    </SendContextProvider>,
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'evm-account-id',
                accounts: {
                  'evm-account-id': {
                    id: 'evm-account-id',
                    type: 'eip155:eoa',
                    address: '0x12345',
                    metadata: {},
                  },
                },
              },
            },
            TokenBalancesController: {
              tokenBalances: {
                '0x12345': {
                  '0x1': {
                    '0x123': '0x5',
                  },
                },
              },
            },
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  '0x12345': {
                    balance: '0xDE0B6B3A7640000',
                  },
                },
              },
            },
            TokenRatesController: {
              marketData: {
                '0x1': {
                  '0x123': {
                    price: 3890,
                  },
                },
              },
            },
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {
                ETH: {
                  conversionRate: 1,
                },
              },
            },
          },
        },
      },
    },
  );

describe('Send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('To:')).toBeTruthy();
    expect(getByText('Value:')).toBeTruthy();
  });

  it('use from address returned from SendContext', async () => {
    const { getByText } = renderComponent();

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('0x12345')).toBeTruthy();
  });

  it('navigate back when cancel is clicked', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('confirm button is disabled for invalid amount value', async () => {
    const mockAddTransaction = jest.spyOn(TransactionUtils, 'addTransaction');
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), 'abc');
    expect(getByText('Invalid amount')).toBeTruthy();
    expect(mockAddTransaction).not.toHaveBeenCalled();
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

  it('when confirm is clicked create transaction for ERC20 token', async () => {
    const mockAddTransaction = jest
      .spyOn(TransactionUtils, 'addTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          result: Promise.resolve('123'),
          transactionMeta: { id: '123' } as TransactionMeta,
        }),
      );
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_to_address'), '0x123');
    fireEvent.changeText(getByTestId('send_amount'), '.01');
    fireEvent.press(getByText('Confirm'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('display error if to address is invalid', async () => {
    const { getByText, getByTestId } = renderComponent();
    await act(async () => {
      fireEvent.changeText(getByTestId('send_to_address'), 'abc');
    });
    expect(getByText('Invalid address')).toBeTruthy();
  });

  it('display warning for to address', async () => {
    Engine.context.AssetsContractController.getERC721AssetSymbol = () =>
      Promise.resolve('ABC');
    const { getByText, getByTestId } = renderComponent();
    await act(async () => {
      fireEvent.changeText(
        getByTestId('send_to_address'),
        '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      );
    });
    expect(
      getByText(
        'This address is a token contract address. If you send tokens to this address, you will lose them.',
      ),
    ).toBeTruthy();
  });

  it('display error if amount is greater than balance for ERC20 token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: '0x123',
          decimals: 2,
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_amount'), '100');
    expect(getByText('Insufficient funds')).toBeTruthy();
  });

  it('when confirm is clicked create transaction for native token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: '0x123',
          isNative: true,
          chainId: '0x1',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const mockAddTransaction = jest
      .spyOn(TransactionUtils, 'addTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          result: Promise.resolve('123'),
          transactionMeta: { id: '123' } as TransactionMeta,
        }),
      );
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_to_address'), '0x123');
    fireEvent.changeText(getByTestId('send_amount'), '1');
    fireEvent.press(getByText('Confirm'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('when confirm is clicked create transaction for NFT', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'MyNFT',
          address: '0x123',
          chainId: '0x1',
          tokenId: '0x1',
        },
      },
    } as RouteProp<ParamListBase, string>);

    const mockAddTransaction = jest
      .spyOn(TransactionUtils, 'addTransaction')
      .mockImplementation(() =>
        Promise.resolve({
          result: Promise.resolve('123'),
          transactionMeta: { id: '123' } as TransactionMeta,
        }),
      );
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_to_address'), '0x123');
    fireEvent.press(getByText('Confirm'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('asset passed in nav params should be used if present', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: '0x123',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = renderComponent();
    expect(getByText('Asset: 0x123')).toBeTruthy();
  });

  it('pressing Max uses max balance of ERC20 token', () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          address: '0x123',
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
        },
      },
    } as RouteProp<ParamListBase, string>);

    const { getByText, getByTestId } = renderComponent();
    expect(getByTestId('send_amount').props.value).toBe('');
    fireEvent.press(getByText('Max'));
    expect(getByTestId('send_amount').props.value).toBe('0.9999685');
    expect(getByText('$ 0.99')).toBeTruthy();
  });

  it('display fiat conversion of amount entered', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: '0x123',
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
          address: '0x123',
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
          address: '0x123',
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
});
