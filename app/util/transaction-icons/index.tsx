import { getAssetFromTheme } from '../theme';

import transactionIconInteraction from '../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../images/transaction-icons/send.png';
import transactionIconReceived from '../../images/transaction-icons/receive.png';
import transactionIconSwapLight from '../../images/transaction-icons/swap.png';
import transactionIconSwapDark from '../../images/transaction-icons/swap-dark.png';
// Failed transaction icons
import transactionIconInteractionFailed from '../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailedLight from '../../images/transaction-icons/swap-failed.png';
import transactionIconSwapFailedDark from '../../images/transaction-icons/swap-failed-dark.png';
import { ColorSchemeName } from 'react-native';

/**
 * Returns the appropriate transaction icon based on type and status
 * @param transactionType - The type of transaction (send, receive, swap, etc.)
 * @param isFailed - Whether the transaction failed
 * @returns The appropriate icon for the transaction
 */
export function getTransactionIcon(
  transactionType: string,
  isFailed: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appTheme: any,
  osColorScheme: ColorSchemeName,
) {
  const swapIcon = getAssetFromTheme(appTheme, osColorScheme, transactionIconSwapLight, transactionIconSwapDark);
  const swapFailedIcon = getAssetFromTheme(appTheme, osColorScheme, transactionIconSwapFailedLight, transactionIconSwapFailedDark);

  switch (transactionType) {
    case 'send':
      return isFailed ? transactionIconSentFailed : transactionIconSent;
    case 'receive':
      return isFailed ? transactionIconReceivedFailed : transactionIconReceived;
    case 'swap':
    case 'bridge':
      return isFailed ? swapFailedIcon : swapIcon;
    default:
      return isFailed
        ? transactionIconInteractionFailed
        : transactionIconInteraction;
  }
}
