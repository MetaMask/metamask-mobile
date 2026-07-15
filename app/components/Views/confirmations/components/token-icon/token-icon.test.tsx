import React from 'react';
import { Hex } from '@metamask/utils';
import { TokenIcon, TokenIconProps } from './token-icon';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { merge } from 'lodash';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';

jest.mock('../../../../Base/TokenIcon', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      icon,
      symbol,
      testID,
    }: {
      icon?: string;
      symbol?: string;
      testID?: string;
    }) =>
      icon
        ? ReactActual.createElement(View, {
            testID,
            accessibilityLabel: icon,
          })
        : ReactActual.createElement(
            Text,
            { testID },
            symbol?.[0]?.toUpperCase(),
          ),
  };
});

const ADDRESS_MOCK = tokenAddress1Mock;
const CHAIN_ID_MOCK = '0x1';
const TOKEN_ICON_URL_MOCK = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${ADDRESS_MOCK}.png`;
const SUPPORTED_CHAIN_ICON_CASES: [string, Hex, string][] = [
  ['mainnet', '0x1', '1'],
  ['Linea', '0xe708', '59144'],
  ['BSC', '0x38', '56'],
  ['Monad', '0x8f', '143'],
];

const STATE_MOCK = merge(
  {},
  otherControllersMock,
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
);

function render(props: TokenIconProps) {
  return renderWithProvider(<TokenIcon {...props} />, {
    state: STATE_MOCK,
  });
}

describe('TokenIcon', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders token icon', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });

    expect(getByTestId('token-icon').props.accessibilityLabel).toBe(
      TOKEN_ICON_URL_MOCK,
    );
  });

  it('renders nothing if token not found', () => {
    const { queryByTestId } = render({
      address: '0x123',
      chainId: CHAIN_ID_MOCK,
    });

    expect(queryByTestId('token-icon')).toBeNull();
  });

  it('renders token icon URL fallback when token metadata is missing', () => {
    const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
    const { getByTestId } = render({
      address,
      chainId: CHAIN_ID_MOCK,
      symbol: 'ABC',
    });

    expect(getByTestId('token-icon').props.accessibilityLabel).toBe(
      `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/${address}.png`,
    );
  });

  it.each(SUPPORTED_CHAIN_ICON_CASES)(
    'renders token icon URL fallback for %s when token metadata is missing',
    (_networkName, chainId, decimalChainId) => {
      const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
      const { getByTestId } = render({
        address,
        chainId,
        symbol: 'ABC',
      });

      expect(getByTestId('token-icon').props.accessibilityLabel).toBe(
        `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/${decimalChainId}/erc20/${address}.png`,
      );
    },
  );
});
