import React from 'react';
import { screen } from '@testing-library/react-native';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import {
  DeepPartial,
  renderScreen,
} from '../../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { RootState } from '../../../../reducers';
import TransactionDetailsSheet from './TransactionDetailsSheet';

interface TransactionOverrides
  extends Omit<Partial<TransactionMeta>, 'txParams'> {
  txParams?: Partial<TransactionMeta['txParams']>;
}

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => mockUseRoute(),
}));

jest.mock('../../../../util/date', () => ({
  toDateFormat: (time: number) => `formatted-${time}`,
}));

const createTransaction = (
  overrides: TransactionOverrides = {},
): TransactionMeta => {
  const baseTransaction: TransactionMeta = {
    id: 'tx-id',
    time: 1000,
    chainId: '0x1',
    networkClientId: 'mainnet',
    status: TransactionStatus.submitted,
    txParams: {
      from: '0x0000000000000000000000000000000000000001',
      to: '0x0000000000000000000000000000000000000002',
      nonce: '0x1',
    },
  };

  return {
    ...baseTransaction,
    ...overrides,
    txParams: {
      ...baseTransaction.txParams,
      ...overrides.txParams,
    },
  };
};

const createRouteParams = (tx: TransactionMeta) => ({
  tx,
  transactionElement: {
    actionKey: 'Send ETH',
  },
  transactionDetails: {
    hash: tx.hash,
    renderFrom: tx.txParams.from,
    renderTo: tx.txParams.to,
    summaryAmount: '1 ETH',
    summaryFee: '0.001 ETH',
    summaryTotalAmount: '1.001 ETH',
    summarySecondaryTotalAmount: '$100',
    txChainId: tx.chainId,
  },
  showSpeedUpModal: jest.fn(),
  showCancelModal: jest.fn(),
});

const createState = (
  transactions: TransactionMeta[],
): DeepPartial<RootState> => ({
  settings: {
    avatarAccountType: AvatarAccountType.Blockies,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      TransactionController: {
        transactions,
        transactionBatches: [],
      },
    },
  },
});

const renderSheet = (
  transactions: TransactionMeta[],
  routeTransaction: TransactionMeta,
) => {
  mockUseRoute.mockReturnValue({
    params: createRouteParams(routeTransaction),
  });

  return renderScreen(
    TransactionDetailsSheet,
    { name: 'TransactionDetailsSheet' },
    {
      state: createState(transactions),
    },
  );
};

describe('TransactionDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses live transaction from Redux when transaction id matches', () => {
    const routeTransaction = createTransaction({
      id: 'route-tx-id',
      time: 1111,
      status: TransactionStatus.submitted,
      txParams: { nonce: '0x1' },
    });
    const otherLiveTransaction = createTransaction({
      id: 'other-tx-id',
      time: 9999,
      status: TransactionStatus.confirmed,
      hash: '0xotherlivehash',
      txParams: { nonce: '0x3' },
    });
    const liveTransaction = createTransaction({
      id: routeTransaction.id,
      time: 2222,
      status: TransactionStatus.confirmed,
      hash: '0xlivehash',
      txParams: { nonce: '0x2' },
    });

    renderSheet([otherLiveTransaction, liveTransaction], routeTransaction);

    expect(screen.getAllByText('formatted-2222')).toHaveLength(2);
    expect(screen.queryByText('formatted-9999')).not.toBeOnTheScreen();
    expect(screen.queryByText('formatted-1111')).not.toBeOnTheScreen();
  });

  it('uses route transaction when Redux does not have a matching transaction', () => {
    const routeTransaction = createTransaction({
      time: 3333,
      status: TransactionStatus.submitted,
    });

    renderSheet([], routeTransaction);

    expect(screen.getAllByText('formatted-3333')).toHaveLength(2);
  });
});
