import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsAmountHeader } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

export function NftDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'nftBuy' | 'nftMint' | 'nftSell' }>;
}) {
  // Mints have no payment leg, so the total reflects the NFT itself (fees only);
  // buys/sells total the fungible/native amount paid or received.
  const totalToken =
    item.type === 'nftMint' ? item.data.token : item.data.paymentToken;

  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsAmountHeader item={item} />}
      token={totalToken}
    />
  );
}
