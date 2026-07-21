import React, { useMemo } from 'react';
import type { RampsOrder } from '@metamask/ramps-controller';
import {
  AvatarTokenSize,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  getRampsOrderCreatedAt,
  getRampsOrderTransactionHash,
  mapRampsOrderType,
  toRampsOrderCaipChainId,
  toRampsOrderToken,
} from '../../../../util/activity-adapters/adapters/ramps-order-helpers';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { ActivityDetailsAvatar } from '../components/ActivityDetailsAvatar';
import { ActivityDetailsBlockExplorerButton } from '../components/ActivityDetailsFooter';
import { ActivityDetailsTemplateFrame } from '../components/ActivityDetailsTemplateFrame';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from '../components/ActivityDetailsLayout';
import { ActivityDetailsAccountValue } from '../components/ActivityDetailsAccountValue';
import {
  RampOrderIdValue,
  RampStatusDescription,
  RampStatusWithProviderLink,
  RampTransactionIdValue,
} from './RampDetailsShared';
import {
  formatRampActivityDate,
  formatRampActivityFiatAmount,
  formatRampActivityFiatTotal,
  getRampActivityExplorerChainId,
  getRampsOrderStatusDescription,
  mapRampsOrderActivityStatus,
  valueOrUnavailable,
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

function RampDetailsHero({ order }: Readonly<{ order: RampsOrder }>) {
  const isSell = isRampsSellOrder(order);
  const token = toRampsOrderToken(order, isSell ? 'out' : 'in');
  const chainId =
    toRampsOrderCaipChainId(order) ??
    getRampActivityExplorerChainId(
      typeof order.network === 'object' && order.network?.chainId
        ? order.network.chainId
        : String(order.network ?? ''),
    );

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}
    >
      <ActivityDetailsAvatar
        tokens={[token]}
        chainId={chainId}
        size={AvatarTokenSize.Xl}
        showNetworkBadge
      />
      <Text
        variant={TextVariant.DisplayMd}
        twClassName="shrink"
        color={isSell ? TextColor.TextDefault : TextColor.SuccessDefault}
      >
        {getRampsHeroAmount(order)}
      </Text>
    </Box>
  );
}

function RampDetailsMetadata({
  chainId,
  formattedDate,
  order,
  providerName,
  transactionHash,
}: {
  readonly chainId: string;
  readonly formattedDate: string;
  readonly order: RampsOrder;
  readonly providerName: string;
  readonly transactionHash?: string;
}) {
  const isSell = isRampsSellOrder(order);
  const statusDescription = getRampsOrderStatusDescription(order);

  return (
    <>
      <ActivityDetailSection>
        <ActivityDetailRow
          label={strings('activity_details.status')}
          value={
            <RampStatusWithProviderLink
              status={mapRampsOrderActivityStatus(order)}
              providerName={providerName}
              providerOrderLink={order.providerOrderLink}
            />
          }
          testID={ActivityDetailsSelectorsIDs.STATUS_ROW}
        />

        <ActivityDetailRow
          label={strings('activity_details.date')}
          value={formattedDate}
          testID={ActivityDetailsSelectorsIDs.DATE_ROW}
        />

        <ActivityDetailRow
          label={strings('transaction_details.label.order_id')}
          value={<RampOrderIdValue orderId={order.providerOrderId} />}
        />

        <ActivityDetailRow
          label={strings('activity_details.account')}
          value={
            <ActivityDetailsAccountValue
              address={order.walletAddress}
              chainId={chainId}
            />
          }
          testID={ActivityDetailsSelectorsIDs.ACCOUNT_ROW}
        />

        {isSell ? (
          <ActivityDetailRow label="Destination" value={providerName} />
        ) : null}

        <ActivityDetailRow
          label={strings('activity_details.transaction_id')}
          value={<RampTransactionIdValue hash={transactionHash} />}
          testID={ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW}
        />
      </ActivityDetailSection>

      <RampStatusDescription description={statusDescription} />
    </>
  );
}

function RampDetailsAmounts({
  fiatValue,
  order,
  totalReceived,
  transactionFee,
}: {
  readonly fiatValue?: string;
  readonly order: RampsOrder;
  readonly totalReceived?: string;
  readonly transactionFee?: string;
}) {
  const currency = order.fiatCurrency?.symbol ?? '';

  if (isRampsSellOrder(order)) {
    return (
      <ActivityDetailSection>
        <ActivityDetailRow
          label={`${currency} value`}
          value={valueOrUnavailable(fiatValue)}
        />
        <ActivityDetailRow
          label="Fees"
          value={valueOrUnavailable(transactionFee)}
        />
        <ActivityDetailRow
          label="Total received"
          value={valueOrUnavailable(totalReceived)}
        />
      </ActivityDetailSection>
    );
  }

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={strings('transaction_details.label.transaction_fee')}
        value={valueOrUnavailable(transactionFee)}
      />
      <ActivityDetailRow
        label={strings('transaction_details.label.total_amount')}
        value={valueOrUnavailable(fiatValue)}
      />
    </ActivityDetailSection>
  );
}

/** Native RampsOrder ActivityDetails template — visual parity with Fiat path. */
export function RampRampsOrderDetails({
  item,
}: Readonly<{ item: RampRampsActivityListItem }>) {
  const order = item.raw.data;
  const transactionHash = getRampsOrderTransactionHash(order);
  const chainId =
    toRampsOrderCaipChainId(order) ??
    getRampActivityExplorerChainId(
      typeof order.network === 'object' && order.network?.chainId
        ? order.network.chainId
        : String(order.network ?? ''),
    );
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
      hero={<RampDetailsHero order={order} />}
      metadata={
        <RampDetailsMetadata
          chainId={chainId}
          formattedDate={formattedDate}
          order={order}
          providerName={providerName}
          transactionHash={transactionHash}
        />
      }
      details={
        <RampDetailsAmounts
          fiatValue={fiatValue}
          order={order}
          totalReceived={totalReceived}
          transactionFee={transactionFee}
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
