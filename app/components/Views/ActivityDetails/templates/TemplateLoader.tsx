import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ApprovalDetails } from './ApprovalDetails';
import { BridgeDetails } from './BridgeDetails';
import { ClaimMusdBonusDetails } from './ClaimMusdBonusDetails';
import { ContractInteractionDetails } from './ContractInteractionDetails';
import { DefaultDetails } from './DefaultDetails';
import { NftDetails } from './NftDetails';
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
    case 'nftMint':
      return <NftDetails item={item} />;
    case 'contractInteraction':
      return <ContractInteractionDetails item={item} />;
    case 'claimMusdBonus':
      return <ClaimMusdBonusDetails item={item} />;
    default:
      return <DefaultDetails item={item} />;
  }
}
