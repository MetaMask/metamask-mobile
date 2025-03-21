import transactionIconInteraction from '../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../images/transaction-icons/send.png';
import transactionIconReceived from '../../images/transaction-icons/receive.png';
import transactionIconSwap from '../../images/transaction-icons/swap.png';

// Failed transaction icons
import transactionIconInteractionFailed from '../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailed from '../../images/transaction-icons/swap-failed.png';


/**
 * Returns the appropriate transaction icon based on type and status
 * @param transactionType - The type of transaction (send, receive, swap, etc.)
 * @param isFailed - Whether the transaction failed
 * @returns The appropriate icon for the transaction
 */
export function getTransactionIcon(transactionType: string, isFailed: boolean) {
  switch (transactionType) {
    case 'send':
      return isFailed ? transactionIconSentFailed : transactionIconSent;
    case 'receive':
      return isFailed ? transactionIconReceivedFailed : transactionIconReceived;
    case 'swap':
      return isFailed ? transactionIconSwapFailed : transactionIconSwap;
    case 'bridge':
    default:
      return isFailed ? transactionIconInteractionFailed : transactionIconInteraction;
  }
}
