/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionDetailsSummary } from './transaction-details-summary';
import { transactionIdMock } from '../../../__mocks__/controllers/transaction-controller-mock';

const mockNavigate = jest.fn();

jest.mock('../../../hooks/activity/useTransactionDetails');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./relay-deposit-summary-line', () => ({
  RelayDepositSummaryLine: () => {
    const ReactNative = require('react-native');

    return <ReactNative.Text>RelayDepositSummaryLine</ReactNative.Text>;
  },
}));

jest.mock('./approval-summary-line', () => ({
  ApprovalSummaryLine: () => {
    const ReactNative = require('react-native');

    return <ReactNative.Text>ApprovalSummaryLine</ReactNative.Text>;
  },
}));

jest.mock('./receive-summary-line', () => ({
  ReceiveSummaryLine: () => {
    const ReactNative = require('react-native');

    return <ReactNative.Text>ReceiveSummaryLine</ReactNative.Text>;
  },
}));

jest.mock('./default-summary-line', () => ({
  DefaultSummaryLine: () => {
    const ReactNative = require('react-native');

    return <ReactNative.Text>DefaultSummaryLine</ReactNative.Text>;
  },
}));

function render({
  transactions,
}: {
  transactions: Partial<TransactionMeta>[];
}) {
  return renderWithProvider(<TransactionDetailsSummary />, {
    state: {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions,
          },
        },
      },
    },
  });
}

const REQUIRED_TRANSACTION_ID_MOCK = '123-456';
const REQUIRED_TRANSACTION_ID_2_MOCK = '789-012';
const BATCH_ID_MOCK = '0x123';

describe('TransactionDetailsSummary', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
      } as unknown as TransactionMeta,
    });
  });

  it('routes relay deposit transactions to RelayDepositSummaryLine', () => {
    const { getByText } = render({
      transactions: [
        {
          id: transactionIdMock,
          chainId: '0x1',
          type: TransactionType.relayDeposit,
        },
      ],
    });

    expect(getByText('RelayDepositSummaryLine')).toBeDefined();
  });

  it('routes approval transactions to ApprovalSummaryLine', () => {
    const { getByText } = render({
      transactions: [
        {
          id: transactionIdMock,
          chainId: '0x1',
          type: TransactionType.tokenMethodApprove,
        },
      ],
    });

    expect(getByText('ApprovalSummaryLine')).toBeDefined();
  });

  it('routes receive types to ReceiveSummaryLine', () => {
    const { getByText } = render({
      transactions: [
        {
          id: transactionIdMock,
          chainId: '0x1',
          type: TransactionType.perpsDeposit,
        },
      ],
    });

    expect(getByText('ReceiveSummaryLine')).toBeDefined();
  });

  it('routes unsupported types to DefaultSummaryLine', () => {
    const { getByText } = render({
      transactions: [
        {
          id: transactionIdMock,
          chainId: '0x1',
          type: TransactionType.swap,
        },
      ],
    });

    expect(getByText('DefaultSummaryLine')).toBeDefined();
  });

  it('renders lines for required transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        requiredTransactionIds: [
          REQUIRED_TRANSACTION_ID_MOCK,
          REQUIRED_TRANSACTION_ID_2_MOCK,
        ],
      } as unknown as TransactionMeta,
    });

    const { getAllByText } = render({
      transactions: [
        {
          id: REQUIRED_TRANSACTION_ID_MOCK,
          chainId: '0x1',
          type: TransactionType.swap,
        },
        {
          id: REQUIRED_TRANSACTION_ID_2_MOCK,
          chainId: '0x1',
          type: TransactionType.swap,
        },
      ],
    });

    expect(getAllByText('DefaultSummaryLine')).toHaveLength(2);
  });

  it('renders lines for batch transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        batchId: BATCH_ID_MOCK,
      } as unknown as TransactionMeta,
    });

    const { getAllByText } = render({
      transactions: [
        {
          id: REQUIRED_TRANSACTION_ID_MOCK,
          chainId: '0x1',
          batchId: BATCH_ID_MOCK,
          type: TransactionType.swap,
        },
        {
          id: REQUIRED_TRANSACTION_ID_2_MOCK,
          chainId: '0x1',
          batchId: BATCH_ID_MOCK,
          type: TransactionType.swap,
        },
      ],
    });

    expect(getAllByText('DefaultSummaryLine')).toHaveLength(2);
  });

  it('skips non-relay child transactions for mUSD conversion parent', () => {
    const sendId = 'send-id';
    const receiveId = 'receive-id';

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        id: transactionIdMock,
        chainId: '0x1',
        type: TransactionType.musdConversion,
        requiredTransactionIds: [sendId, receiveId],
      } as unknown as TransactionMeta,
    });

    const { getByText, queryByText } = render({
      transactions: [
        {
          id: sendId,
          chainId: '0x1',
          type: TransactionType.relayDeposit,
        },
        {
          id: receiveId,
          chainId: '0x1',
          type: TransactionType.contractInteraction,
        },
        {
          id: transactionIdMock,
          chainId: '0x1',
          type: TransactionType.musdConversion,
        },
      ],
    });

    expect(getByText('RelayDepositSummaryLine')).toBeDefined();
    expect(getByText('ReceiveSummaryLine')).toBeDefined();
    expect(queryByText('DefaultSummaryLine')).toBeNull();
  });
});
