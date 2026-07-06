import type { ActivityKind } from '../../../util/activity-adapters';

/**
 * Maps an activity kind to the transaction icon family used by
 * `getTransactionIcon`. Shared by the resolved and pending row variants.
 */
export function resolveIconType(type: ActivityKind): string {
  switch (type) {
    case 'send':
    case 'sell':
    case 'lendingDeposit':
    case 'deposit':
    case 'wrap':
    case 'perpsAddFunds':
    case 'predictionsAddFunds':
      return 'send';
    case 'receive':
    case 'buy':
    case 'claim':
    case 'claimMusdBonus':
    case 'lendingWithdrawal':
    case 'unwrap':
    case 'nftMint':
    case 'perpsWithdraw':
    case 'predictionsWithdrawFunds':
    case 'predictionClaimWinnings':
    case 'predictionCashedOut':
    case 'predictionPlaced':
    case 'perpsReceivedFundingFees':
      return 'receive';
    case 'swap':
    case 'swapIncomplete':
    case 'bridge':
    case 'convert':
      return 'swap';
    case 'approveSpendingCap':
    case 'revokeSpendingCap':
    case 'increaseSpendingCap':
    case 'contractInteraction':
    case 'contractDeployment':
    case 'smartAccountUpgrade':
    case 'perpsOpenLong':
    case 'perpsCloseLong':
    case 'perpsCloseLongLiquidated':
    case 'perpsCloseLongStopLoss':
    case 'perpsOpenShort':
    case 'perpsCloseShort':
    case 'perpsCloseShortLiquidated':
    case 'perpsCloseShortStopLoss':
    case 'perpsPaidFundingFees':
    case 'perpsCloseShortTakeProfit':
    case 'perpsCloseLongTakeProfit':
    case 'marketShort':
    case 'stopMarketCloseShort':
    case 'marketCloseShort':
      return 'interaction';
  }
}
