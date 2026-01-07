import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import {
  useNestedTransactionTransferRecipients,
  useTransferRecipient,
} from './useTransferRecipient';

const nativeTransferState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.simpleSend,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              to: '0x97cb1fdd071da9960d38306c07f146bc98b21231',
            },
          },
        ],
      },
    },
  },
});

const erc20TransferState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.tokenMethodTransfer,
            txParams: {
              data: '0xa9059cbb00000000000000000000000097cb1fdd071da9960d38306c07f146bc98b2d31700000000000000000000000000000000000000000000000000000000000f4240',
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
          },
        ],
      },
    },
  },
});

const nftSafeTransferState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.tokenMethodSafeTransferFrom,
            txParams: {
              // safeTransferFrom(address from, address to, uint256 tokenId)
              data: '0x42842e0e000000000000000000000000dc47789de4ceff0e8fe9d15d728af7f17550c16400000000000000000000000097cb1fdd071da9960d38306c07f146bc98b2d3170000000000000000000000000000000000000000000000000000000000000001',
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
          },
        ],
      },
    },
  },
});

const noNestedTransactionsState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.simpleSend,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              to: '0x97cb1fdd071da9960d38306c07f146bc98b21231',
            },
          },
        ],
      },
    },
  },
});

const singleNativeNestedTransactionState = merge(
  {},
  transferConfirmationState,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.batch,
              txParams: {
                from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              },
              nestedTransactions: [
                {
                  to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
                  data: '0x654365436543',
                  value: '0x3B9ACA00',
                  type: TransactionType.simpleSend,
                },
              ],
            },
          ],
        },
      },
    },
  },
);

const singleErc20NestedTransactionState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.batch,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
            nestedTransactions: [
              {
                to: '0x6b175474e89094c44da98b954eedeac495271d0f',
                data: '0xa9059cbb00000000000000000000000097cb1fdd071da9960d38306c07f146bc98b2d31700000000000000000000000000000000000000000000000000000000000f4240',
                type: TransactionType.tokenMethodTransfer,
              },
            ],
          },
        ],
      },
    },
  },
});

const multipleNestedTransactionsState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.batch,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
            nestedTransactions: [
              {
                to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
                data: '0x654365436543',
                value: '0x3B9ACA00',
                type: TransactionType.simpleSend,
              },
              {
                to: '0xbc2114a988e9cef5ba63548d432024f34b487048',
                data: '0x789078907890',
                value: '0x1DCD6500',
                type: TransactionType.simpleSend,
              },
            ],
          },
        ],
      },
    },
  },
});

const mixedNestedTransactionsState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.batch,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
            nestedTransactions: [
              {
                to: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
                data: '0x654365436543',
                value: '0x3B9ACA00',
                type: TransactionType.simpleSend,
              },
              {
                to: '0x6b175474e89094c44da98b954eedeac495271d0f',
                data: '0xa9059cbb00000000000000000000000097cb1fdd071da9960d38306c07f146bc98b2d31700000000000000000000000000000000000000000000000000000000000f4240',
                type: TransactionType.tokenMethodTransfer,
              },
            ],
          },
        ],
      },
    },
  },
});

describe('useTransferRecipient', () => {
  it('returns the correct recipient for native transfer', async () => {
    const { result } = renderHookWithProvider(() => useTransferRecipient(), {
      state: nativeTransferState,
    });

    expect(result.current).toBe('0x97cb1fdd071da9960d38306c07f146bc98b21231');
  });

  it('returns the correct recipient for erc20 transfer', async () => {
    const { result } = renderHookWithProvider(() => useTransferRecipient(), {
      state: erc20TransferState,
    });

    expect(result.current).toBe('0x97cb1fdD071da9960d38306C07F146bc98b2D317');
  });

  it('returns the correct recipient for NFT safeTransferFrom', async () => {
    const { result } = renderHookWithProvider(() => useTransferRecipient(), {
      state: nftSafeTransferState,
    });

    expect(result.current).toBe('0x97cb1fdD071da9960d38306C07F146bc98b2D317');
  });
});

describe('useNestedTransactionTransferRecipients', () => {
  it('returns empty array when no nested transactions', async () => {
    const { result } = renderHookWithProvider(
      () => useNestedTransactionTransferRecipients(),
      {
        state: noNestedTransactionsState,
      },
    );

    expect(result.current).toEqual([]);
  });

  it('returns the correct recipient for single native nested transaction', async () => {
    const { result } = renderHookWithProvider(
      () => useNestedTransactionTransferRecipients(),
      {
        state: singleNativeNestedTransactionState,
      },
    );

    expect(result.current).toEqual([
      '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
    ]);
  });

  it('returns the correct recipient for single erc20 nested transaction', async () => {
    const { result } = renderHookWithProvider(
      () => useNestedTransactionTransferRecipients(),
      {
        state: singleErc20NestedTransactionState,
      },
    );

    expect(result.current).toEqual([
      '0x97cb1fdD071da9960d38306C07F146bc98b2D317',
    ]);
  });

  it('returns the correct recipients for multiple native nested transactions', async () => {
    const { result } = renderHookWithProvider(
      () => useNestedTransactionTransferRecipients(),
      {
        state: multipleNestedTransactionsState,
      },
    );

    expect(result.current).toEqual([
      '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
      '0xbc2114a988e9cef5ba63548d432024f34b487048',
    ]);
  });

  it('returns the correct recipients for mixed nested transactions', async () => {
    const { result } = renderHookWithProvider(
      () => useNestedTransactionTransferRecipients(),
      {
        state: mixedNestedTransactionsState,
      },
    );

    expect(result.current).toEqual([
      '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb',
      '0x97cb1fdD071da9960d38306C07F146bc98b2D317',
    ]);
  });
});
