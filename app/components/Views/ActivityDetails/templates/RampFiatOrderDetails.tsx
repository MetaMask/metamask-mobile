import React, { useMemo } from 'react';
import { getProviderName } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsBlockExplorerButton } from '../components/ActivityDetailsFooter';
import { ActivityDetailsTemplateFrame } from '../components/ActivityDetailsTemplateFrame';
import {
  RampDetailsAmountsSection,
  RampDetailsHeroView,
  RampDetailsMetadataSection,
} from './RampDetailsShared';
import {
  formatRampActivityDate,
  formatRampActivityFiatAmount,
  formatRampActivityFiatTotal,
  getFiatOrderProviderOrderLink,
  getFiatOrderStatusDescription,
  getRampActivityExplorerChainId,
  getRampActivityHeroAmount,
  getRampActivityHeroToken,
  getRampActivityTransactionHash,
  isRampSellOrder,
  mapRampActivityStatus,
} from './rampDetailsUtils';

export type RampFiatActivityListItem = ActivityListItem & {
  type: 'buy' | 'sell';
  raw: { type: 'rampOrder'; data: FiatOrder };
};

/** Legacy FiatOrder ActivityDetails template — extract of prior RampDetails. */
export function RampFiatOrderDetails({
  item,
}: Readonly<{ item: RampFiatActivityListItem }>) {
  const order = item.raw.data;
  const isSell = isRampSellOrder(order);
  const transactionHash = getRampActivityTransactionHash(order);
  const chainId = getRampActivityExplorerChainId(order.network);
  const providerName = getProviderName(order.provider, order.data);

  const formattedDate = useMemo(
    () => formatRampActivityDate(order.createdAt),
    [order.createdAt],
  );

  const transactionFee =
    formatRampActivityFiatAmount(order.fee, order.currency) ??
    formatRampActivityFiatAmount(order.cryptoFee, order.currency);
  const fiatValue = formatRampActivityFiatAmount(order.amount, order.currency);
  const totalReceived = formatRampActivityFiatTotal(
    order.amount,
    order.fee,
    order.currency,
  );

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <RampDetailsHeroView
          token={getRampActivityHeroToken(order)}
          chainId={chainId}
          amountLabel={getRampActivityHeroAmount(order)}
          isSell={isSell}
        />
      }
      metadata={
        <RampDetailsMetadataSection
          status={mapRampActivityStatus(order)}
          providerName={providerName}
          providerOrderLink={getFiatOrderProviderOrderLink(order)}
          statusDescription={getFiatOrderStatusDescription(order)}
          formattedDate={formattedDate}
          orderId={order.id}
          accountAddress={order.account}
          chainId={chainId}
          isSell={isSell}
          transactionHash={transactionHash}
        />
      }
      details={
        <RampDetailsAmountsSection
          currency={order.currency}
          isSell={isSell}
          fiatValue={fiatValue}
          transactionFee={transactionFee}
          totalReceived={totalReceived}
        />
      }
      footer={
        <ActivityDetailsBlockExplorerButton
          chainId={chainId}
          hash={transactionHash}
        />
      }
    />
  );
}
