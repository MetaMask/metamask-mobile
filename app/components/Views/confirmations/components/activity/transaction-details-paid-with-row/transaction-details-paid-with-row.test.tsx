import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { TransactionDetailsPaidWithRow } from './transaction-details-paid-with-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';
import { TransactionMeta } from '@metamask/transaction-controller';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../../../UI/Bridge/hooks/useTokensWithBalance');

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x1';
const TOKEN_SYMBOL_MOCK = 'TST';

function render() {
  return renderWithProvider(<TransactionDetailsPaidWithRow />, {});
}

describe('TransactionDetailsPaidWithRow', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        metamaskPay: {
          chainId: CHAIN_ID_MOCK,
          tokenAddress: TOKEN_ADDRESS_MOCK,
        },
      } as unknown as TransactionMeta,
    });

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: 6,
        symbol: TOKEN_SYMBOL_MOCK,
      },
    ]);
  });

  it('renders token symbol', () => {
    const { getByText } = render();
    expect(getByText(TOKEN_SYMBOL_MOCK)).toBeDefined();
  });

  it('renders token icon', () => {
    const { getByTestId } = render();
    expect(getByTestId('token-icon')).toBeDefined();
  });
});
