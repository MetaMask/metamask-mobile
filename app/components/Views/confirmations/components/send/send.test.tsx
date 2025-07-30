import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../../util/transaction-controller';
import { SendContextProvider } from '../../context/send-context';
import { Send } from './send';

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
    fireEvent.changeText(getByTestId('send_amount'), '1');
    fireEvent.press(getByText('Confirm'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
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
});
