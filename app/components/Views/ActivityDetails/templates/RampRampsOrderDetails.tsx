import React, { useMemo } from 'react';
import type { RampsOrder } from '@metamask/ramps-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  getRampsOrderCreatedAt,
  getRampsOrderTransactionHash,
  mapRampsOrderType,
  toRampsOrderCaipChainId,
  toRampsOrderToken,
} from '../../../../util/activity-adapters/adapters/ramps-order-helpers';
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
  getRampActivityExplorerChainId,
  getRampsOrderStatusDescription,
  mapRampsOrderActivityStatus,
} from './rampDetailsUtils';

export type RampRampsActivityListItem = ActivityListItem & {
  type: 'buy' | 'sell';
  raw: { type: 'rampOrder'; data: RampsOrder };
};

function isRampsSellOrder(order: RampsOrder) {
  return mapRampsOrderType(order.orderType) === 'sell';
}

function getRampsHeroAmount(order: RampsOrder) {
  const amount =
    order.cryptoAmount === undefined || order.cryptoAmount === null
      ? '0'
      : String(order.cryptoAmount);
  const symbol = order.cryptoCurrency?.symbol ?? '';
  const sign = isRampsSellOrder(order) ? '-' : '+';
  return `${sign}${amount} ${symbol}`.trim();
}

function getRampsExplorerChainId(order: RampsOrder) {
  return (
    toRampsOrderCaipChainId(order) ??
    getRampActivityExplorerChainId(
      typeof order.network === 'object' && order.network?.chainId
        ? order.network.chainId
        : String(order.network ?? ''),
    )
  );
}

/** Native RampsOrder ActivityDetails template — visual parity with Fiat path. */
export function RampRampsOrderDetails({
  item,
}: Readonly<{ item: RampRampsActivityListItem }>) {
  const order = item.raw.data;
  const isSell = isRampsSellOrder(order);
  const transactionHash = getRampsOrderTransactionHash(order);
  const chainId = getRampsExplorerChainId(order);
  const providerName = order.provider?.name ?? '';
  const currency = order.fiatCurrency?.symbol ?? '';

  const formattedDate = useMemo(
    () => formatRampActivityDate(getRampsOrderCreatedAt(order)),
    [order],
  );

  const transactionFee = formatRampActivityFiatAmount(
    order.totalFeesFiat,
    currency,
  );
  const fiatValue = formatRampActivityFiatAmount(order.fiatAmount, currency);
  const totalReceived = formatRampActivityFiatTotal(
    order.fiatAmount,
    order.totalFeesFiat,
    currency,
  );

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <RampDetailsHeroView
          token={toRampsOrderToken(order, isSell ? 'out' : 'in')}
          chainId={chainId}
          amountLabel={getRampsHeroAmount(order)}
          isSell={isSell}
        />
      }
      metadata={
        <RampDetailsMetadataSection
          status={mapRampsOrderActivityStatus(order)}
          providerName={providerName}
          providerOrderLink={order.providerOrderLink}
          statusDescription={getRampsOrderStatusDescription(order)}
          formattedDate={formattedDate}
          orderId={order.providerOrderId}
          accountAddress={order.walletAddress}
          chainId={chainId}
          isSell={isSell}
          transactionHash={transactionHash}
        />
      }
      details={
        <RampDetailsAmountsSection
          currency={currency}
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
