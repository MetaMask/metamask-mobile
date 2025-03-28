import { getTransactionIcon } from './index';

import transactionIconInteraction from '../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../images/transaction-icons/send.png';
import transactionIconReceived from '../../images/transaction-icons/receive.png';
import transactionIconSwap from '../../images/transaction-icons/swap.png';
import transactionIconInteractionFailed from '../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailed from '../../images/transaction-icons/swap-failed.png';

describe('getTransactionIcon', () => {
  test('returns the correct icon for successful send transactions', () => {
    expect(getTransactionIcon('send', false)).toBe(transactionIconSent);
  });

  test('returns the correct icon for successful receive transactions', () => {
    expect(getTransactionIcon('receive', false)).toBe(transactionIconReceived);
  });

  test('returns the correct icon for successful swap transactions', () => {
    expect(getTransactionIcon('swap', false)).toBe(transactionIconSwap);
  });

  test('returns the interaction icon for bridge transactions', () => {
    expect(getTransactionIcon('bridge', false)).toBe(
      transactionIconInteraction,
    );
  });

  test('returns the correct icon for failed send transactions', () => {
    expect(getTransactionIcon('send', true)).toBe(transactionIconSentFailed);
  });

  test('returns the correct icon for failed receive transactions', () => {
    expect(getTransactionIcon('receive', true)).toBe(
      transactionIconReceivedFailed,
    );
  });

  test('returns the correct icon for failed swap transactions', () => {
    expect(getTransactionIcon('swap', true)).toBe(transactionIconSwapFailed);
  });

  test('returns the failed interaction icon for failed bridge transactions', () => {
    expect(getTransactionIcon('bridge', true)).toBe(
      transactionIconInteractionFailed,
    );
  });
});
