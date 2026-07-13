import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsAmountHeader } from '../components';
import { ActivityDetailsStandardTemplate } from './ActivityDetailsStandardTemplate';

export function NftDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'nftBuy' | 'nftMint' | 'nftSell' }>;
}) {
  const totalToken =
    item.type === 'nftMint' ? item.data.token : item.data.paymentToken;

  return (
    <ActivityDetailsStandardTemplate
      item={item}
      header={<ActivityDetailsAmountHeader item={item} />}
      token={totalToken}
      addressRows={{ from: item.data.from, to: item.data.to }}
    />
  );
}
