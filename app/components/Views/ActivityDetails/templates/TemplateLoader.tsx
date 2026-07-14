import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ApprovalDetails } from './ApprovalDetails';
import { BridgeDetails } from './BridgeDetails';
import { ClaimMusdBonusDetails } from './ClaimMusdBonusDetails';
import { ContractInteractionDetails } from './ContractInteractionDetails';
import { DefaultDetails } from './DefaultDetails';
import { DepositDetails } from './DepositDetails';
import { NftDetails } from './NftDetails';
import { SmartAccountUpgradeDetails } from './SmartAccountUpgradeDetails';
import { PerpsDetails } from './PerpsDetails';
import { PredictDetails } from './PredictDetails';
import { isRampActivityListItem, RampDetails } from './RampDetails';
import { SendDetails } from './SendDetails';
import { SwapDetails } from './SwapDetails';

/**
 * Dispatches an {@link ActivityListItem} to its per-type details template,
 * mirroring the extension's `template-loader`.
 */
export function TemplateLoader({
  item,
}: {
  item: ActivityListItem | undefined;
}) {
  if (!item) {
    return null;
  }

  switch (item.type) {
    case 'send':
    case 'receive':
      return <SendDetails item={item} />;
    case 'bridge':
      return <BridgeDetails item={item} />;
    case 'swap':
    case 'swapIncomplete':
    case 'convert':
    case 'lendingDeposit':
    case 'lendingWithdrawal':
    case 'wrap':
    case 'unwrap':
      return <SwapDetails item={item} />;
    case 'approveSpendingCap':
    case 'revokeSpendingCap':
    case 'increaseSpendingCap':
      return <ApprovalDetails item={item} />;
    case 'nftBuy':
    case 'nftMint':
    case 'nftSell':
      return <NftDetails item={item} />;
    case 'contractInteraction':
      return <ContractInteractionDetails item={item} />;
    case 'claimMusdBonus':
      return <ClaimMusdBonusDetails item={item} />;
    case 'claim':
    case 'stake':
    case 'unstake':
      return <DepositDetails item={item} />;
    case 'smartAccountUpgrade':
      return <SmartAccountUpgradeDetails item={item} />;
    case 'deposit':
      return isRampActivityListItem(item) ? (
        <RampDetails item={item} />
      ) : (
        <DepositDetails item={item} />
      );
    case 'buy':
    case 'sell':
      return isRampActivityListItem(item) ? (
        <RampDetails item={item} />
      ) : (
        <DefaultDetails item={item} />
      );
    case 'predictionsAddFunds':
    case 'predictionsWithdrawFunds':
    case 'predictionClaimWinnings':
    case 'predictionCashedOut':
    case 'predictionPlaced':
      return <PredictDetails item={item} />;
    case 'perpsAddFunds':
    case 'perpsWithdraw':
    case 'perpsOpenLong':
    case 'perpsCloseLong':
    case 'perpsCloseLongLiquidated':
    case 'perpsCloseLongStopLoss':
    case 'perpsOpenShort':
    case 'perpsCloseShort':
    case 'perpsCloseShortLiquidated':
    case 'perpsCloseShortStopLoss':
    case 'perpsPaidFundingFees':
    case 'perpsReceivedFundingFees':
    case 'perpsCloseShortTakeProfit':
    case 'perpsCloseLongTakeProfit':
    case 'marketShort':
    case 'stopMarketCloseShort':
    case 'marketCloseShort':
    case 'limitShort':
    case 'limitCloseShort':
    case 'marketLong':
    case 'stopMarketCloseLong':
    case 'marketCloseLong':
    case 'limitLong':
    case 'limitCloseLong':
      return <PerpsDetails item={item} />;
    default:
      return <DefaultDetails item={item} />;
  }
}
