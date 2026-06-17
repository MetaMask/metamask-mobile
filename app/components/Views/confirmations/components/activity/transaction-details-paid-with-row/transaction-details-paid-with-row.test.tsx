import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsPaidWithRow } from './transaction-details-paid-with-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext');
jest.mock('../../../hooks/tokens/useTokenWithBalance');

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x1';
const TOKEN_SYMBOL_MOCK = 'TST';

function render() {
  return renderWithProvider(<TransactionDetailsPaidWithRow />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetailsPaidWithRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();
    useIsMoneyAccountContextMock.mockReturnValue(false);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    useTokenWithBalanceMock.mockReturnValue({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      decimals: 6,
      symbol: TOKEN_SYMBOL_MOCK,
    } as unknown as ReturnType<typeof useTokenWithBalance>);
  });

  it('renders token symbol', () => {
    const { getByText } = render();
    expect(getByText(TOKEN_SYMBOL_MOCK)).toBeDefined();
  });

  it('renders token icon', () => {
    const { getByTestId } = render();
    expect(getByTestId('token-icon')).toBeDefined();
  });

  it('renders nothing if no payment token', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {},
      } as unknown as TransactionMeta,
    });

    const { queryByText } = render();

    expect(queryByText(TOKEN_SYMBOL_MOCK)).toBeNull();
  });

  it('renders nothing if token not found', () => {
    useTokenWithBalanceMock.mockReturnValue(undefined);

    const { queryByText } = render();

    expect(queryByText(TOKEN_SYMBOL_MOCK)).toBeNull();
  });

  it('renders nothing for deposit types in money context', () => {
    useIsMoneyAccountContextMock.mockReturnValue(true);
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        type: TransactionType.moneyAccountDeposit,
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });
});
