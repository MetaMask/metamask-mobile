import type {
  MultichainBalancesControllerState,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import { RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import {
  TRIGGER_TYPES,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';
import { hexToNumber } from '@metamask/utils';
import { AccountType } from '../../constants/onboarding';

/** USD threshold from product spec: ignore deposits ≤ $1 to reduce dust noise. */
export const WALLET_FUNDS_OBTAINED_MIN_USD_EXCLUSIVE = 1;

export type WalletFundsObtainedSource = 'on_ramp' | 'external_transfer';

export type EthOrErc20ReceivedNotification = Extract<
  INotification,
  {
    type:
      | typeof TRIGGER_TYPES.ETH_RECEIVED
      | typeof TRIGGER_TYPES.ERC20_RECEIVED;
  }
>;

export function isCreatedWalletAccountType(
  accountType: AccountType | undefined,
): boolean {
  if (accountType === undefined) {
    return false;
  }
  return (
    accountType === AccountType.Metamask ||
    accountType === AccountType.MetamaskGoogle ||
    accountType === AccountType.MetamaskApple
  );
}

/**
 * True if any EVM token balance is non-zero (same idea as the extension monitor).
 */
export function hasNonZeroTokenBalance(
  tokenBalances: TokenBalancesControllerState['tokenBalances'] = {},
): boolean {
  for (const accountBalances of Object.values(tokenBalances)) {
    for (const chainBalances of Object.values(accountBalances || {})) {
      for (const balance of Object.values(chainBalances || {})) {
        if (hexToNumber(balance || '0x0') > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * True if any multichain balance entry has a non-zero amount.
 */
export function hasNonZeroMultichainBalance(
  multichainBalances: MultichainBalancesControllerState['balances'] = {},
): boolean {
  for (const accountBalances of Object.values(multichainBalances)) {
    for (const chainBalances of Object.values(accountBalances || {})) {
      if (chainBalances?.amount && chainBalances.amount !== '0') {
        return true;
      }
    }
  }
  return false;
}

function normalizeTxHash(tx: string | undefined): string | undefined {
  if (!tx) {
    return undefined;
  }
  return tx.toLowerCase();
}

/**
 * Classify funding source: on-ramp when a completed buy order matches the notification tx hash.
 */
export function getWalletFundsObtainedSource(
  notification: EthOrErc20ReceivedNotification,
  rampOrders: RampsOrder[],
): WalletFundsObtainedSource {
  const txHash = normalizeTxHash(notification.payload.tx_hash);
  if (!txHash) {
    return 'external_transfer';
  }

  const hasMatchingCompletedBuy = rampOrders.some(
    (order) =>
      order.status === RampsOrderStatus.Completed &&
      order.orderType === 'BUY' &&
      Boolean(order.txHash) &&
      normalizeTxHash(order.txHash) === txHash,
  );

  return hasMatchingCompletedBuy ? 'on_ramp' : 'external_transfer';
}

export function filterEthOrErc20ReceivedNotifications(
  notifications: INotification[],
): EthOrErc20ReceivedNotification[] {
  return notifications.filter(
    (n): n is EthOrErc20ReceivedNotification =>
      n.type === TRIGGER_TYPES.ERC20_RECEIVED ||
      n.type === TRIGGER_TYPES.ETH_RECEIVED,
  );
}

/**
 * Picks the oldest qualifying receive notification in the batch (extension parity).
 */
export function pickOldestEthOrErc20Received(
  notifications: INotification[],
): EthOrErc20ReceivedNotification | undefined {
  const filtered = filterEthOrErc20ReceivedNotifications(notifications);
  return filtered.at(-1);
}

export function getUsdAmountFromReceiveNotification(
  notification: EthOrErc20ReceivedNotification,
): string | undefined {
  if (notification.type === TRIGGER_TYPES.ERC20_RECEIVED) {
    return notification.payload.data.token.usd;
  }
  return notification.payload.data.amount.usd;
}

export function getAssetSymbolFromReceiveNotification(
  notification: EthOrErc20ReceivedNotification,
): string {
  if (notification.type === TRIGGER_TYPES.ERC20_RECEIVED) {
    return notification.payload.data.token.symbol;
  }
  return notification.payload.network.native_symbol;
}

export function isAboveWalletFundsObtainedThreshold(
  amountUsd: string,
): boolean {
  return Number(amountUsd) > WALLET_FUNDS_OBTAINED_MIN_USD_EXCLUSIVE;
}

export function computeDaysSinceWalletCreation(
  walletCreatedAtMs: number,
  nowMs: number = Date.now(),
): number {
  const msPerDay = 86_400_000;
  return Math.floor((nowMs - walletCreatedAtMs) / msPerDay);
}
