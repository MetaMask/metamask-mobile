import React from 'react';
import { Interface } from '@ethersproject/abi';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsHero } from './transaction-details-hero';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { DISTRIBUTOR_CLAIM_ABI } from '../../../../../UI/Earn/components/MerklRewards/constants';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/tokens/useTokenWithBalance');

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';
const DATA_MOCK =
  '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000000000000001E240';
const DECIMALS_MOCK = 3;

const TRANSACTION_META_MOCK = {
  chainId: CHAIN_ID_MOCK,
  txParams: {
    data: DATA_MOCK,
    to: TOKEN_ADDRESS_MOCK,
  },
  type: TransactionType.perpsDeposit,
} as unknown as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsHero />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetailsHero', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useTokenWithBalanceMock.mockReturnValue({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      decimals: DECIMALS_MOCK,
      symbol: 'TST',
    } as unknown as ReturnType<typeof useTokenWithBalance>);
  });

  it('renders human amount', () => {
    const { getByText } = render();
    expect(getByText('$123.46')).toBeDefined();
  });

  it('renders human amount if token transfer is nested call', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: '0x123',
          to: '0x456',
        },
        nestedTransactions: [
          {
            data: DATA_MOCK,
            to: TOKEN_ADDRESS_MOCK,
          },
        ],
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText('$123.46')).toBeDefined();
  });

  it('renders nothing if no to', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          to: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no decimals', () => {
    useTokenWithBalanceMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof useTokenWithBalance>,
    );

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no amount in data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders targetFiat from metamaskPay when available', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        metamaskPay: {
          targetFiat: '456.78',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText('$456.78')).toBeDefined();
  });

  it('renders amount for musdConversion transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdConversion,
        metamaskPay: {
          targetFiat: '100.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText('$100')).toBeDefined();
  });

  it('renders claim amount for musdClaim with valid claim data', () => {
    const USER_ADDRESS = '0x1234567890123456789012345678901234567890';
    const TOKEN_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const claimAmount = '75500000000000000000'; // 75.5 mUSD

    const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
    const claimData = contractInterface.encodeFunctionData('claim', [
      [USER_ADDRESS],
      [TOKEN_ADDRESS],
      [claimAmount],
      [[]],
    ]);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdClaim,
        txParams: {
          data: claimData,
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText('$75.50')).toBeDefined();
  });

  it('renders nothing for musdClaim without valid claim data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdClaim,
        txParams: {
          data: '0x123', // Invalid claim data
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });
});
