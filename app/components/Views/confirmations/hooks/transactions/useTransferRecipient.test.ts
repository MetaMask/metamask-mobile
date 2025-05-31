import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { useTransferRecipient } from './useTransferRecipient';

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
});
