import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtils from '../../../../../../util/transaction-controller';
// eslint-disable-next-line import/no-namespace
import * as ToAddressValidationUtils from '../../../hooks/send/useToAddressValidation';
import { SendContextProvider } from '../../../context/send-context';
import {
  evmSendStateMock,
  TOKEN_ADDRESS_MOCK_1,
} from '../../../__mocks__/send.mock';
import { SendTo } from './send-to';
import { useRouteParams } from '../../../hooks/send/useRouteParams';
import Engine from '../../../../../../core/Engine';
import { TransactionMeta } from '@metamask/transaction-controller';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
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

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    AssetsContractController: {
      getERC721AssetSymbol: Promise.resolve(undefined),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
  },
}));

const SendToComponent = () => {
  useRouteParams();
  return (
    <>
      <SendTo />
    </>
  );
};

const renderComponent = () =>
  renderWithProvider(
    <SendContextProvider>
      <SendToComponent />
    </SendContextProvider>,
    {
      state: evmSendStateMock,
    },
  );

describe('SendTo', () => {
  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('To:')).toBeTruthy();
  });

  it('display error and warning if present', async () => {
    jest
      .spyOn(ToAddressValidationUtils, 'useToAddressValidation')
      .mockReturnValue({
        toAddressError: 'Error in recipient address',
        toAddressWarning: 'Warning in recipient address',
      });

    const { getByText } = renderComponent();
    expect(getByText('Error in recipient address')).toBeTruthy();
    expect(getByText('Warning in recipient address')).toBeTruthy();
  });

  it('display error for invalid to address value', async () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_to_address'), 'abc');
    await waitFor(async () => {
      expect(getByText('Invalid address')).toBeTruthy();
    });
  });

  it('continue button is disabled for invalid to address value', async () => {
    const { getByText, getByTestId } = renderComponent();
    fireEvent.changeText(getByTestId('send_to_address'), 'abc');
    await waitFor(async () => {
      expect(getByText('Invalid address')).toBeTruthy();
      fireEvent.press(getByText('Continue'));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
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
    fireEvent.changeText(getByTestId('send_to_address'), TOKEN_ADDRESS_MOCK_1);
    fireEvent.press(getByText('Continue'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('when confirm is clicked create transaction for native token', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
          address: TOKEN_ADDRESS_MOCK_1,
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
    fireEvent.changeText(getByTestId('send_to_address'), TOKEN_ADDRESS_MOCK_1);
    fireEvent.press(getByText('Continue'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('when confirm is clicked create transaction for NFT', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'MyNFT',
          address: TOKEN_ADDRESS_MOCK_1,
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
    fireEvent.changeText(getByTestId('send_to_address'), TOKEN_ADDRESS_MOCK_1);
    fireEvent.press(getByText('Continue'));
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
  });
});
