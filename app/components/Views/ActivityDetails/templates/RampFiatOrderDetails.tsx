import React, { useMemo } from 'react';
import {
  AvatarTokenSize,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { getProviderName } from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { ActivityListItem } from '../../../../util/activity-adapters';
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
  getFiatOrderProviderOrderLink,
  getFiatOrderStatusDescription,
  getRampActivityExplorerChainId,
  getRampActivityHeroAmount,
  getRampActivityHeroToken,
  getRampActivityTransactionHash,
  isRampSellOrder,
  mapRampActivityStatus,
  valueOrUnavailable,
} from './rampDetailsUtils';

export type RampFiatActivityListItem = ActivityListItem & {
  type: 'buy' | 'sell';
  raw: { type: 'rampOrder'; data: FiatOrder };
};

function RampDetailsHero({ order }: Readonly<{ order: FiatOrder }>) {
  const token = getRampActivityHeroToken(order);

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}
    >
      <ActivityDetailsAvatar
        tokens={[token]}
        chainId={getRampActivityExplorerChainId(order.network)}
        size={AvatarTokenSize.Xl}
        showNetworkBadge
      />
      <Text
        variant={TextVariant.DisplayMd}
        twClassName="shrink"
        color={
          isRampSellOrder(order)
            ? TextColor.TextDefault
            : TextColor.SuccessDefault
        }
      >
        {getRampActivityHeroAmount(order)}
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
  readonly order: FiatOrder;
  readonly providerName: string;
  readonly transactionHash?: string;
}) {
  const isSell = isRampSellOrder(order);
  const providerOrderLink = getFiatOrderProviderOrderLink(order);
  const statusDescription = getFiatOrderStatusDescription(order);

  return (
    <>
      <ActivityDetailSection>
        <ActivityDetailRow
          label={strings('activity_details.status')}
          value={
            <RampStatusWithProviderLink
              status={mapRampActivityStatus(order)}
              providerName={providerName}
              providerOrderLink={providerOrderLink}
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
          value={<RampOrderIdValue orderId={order.id} />}
        />

        <ActivityDetailRow
          label={strings('activity_details.account')}
          value={
            <ActivityDetailsAccountValue
              address={order.account}
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
  readonly order: FiatOrder;
  readonly totalReceived?: string;
  readonly transactionFee?: string;
}) {
  if (isRampSellOrder(order)) {
    return (
      <ActivityDetailSection>
        <ActivityDetailRow
          label={`${order.currency} value`}
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

/** Legacy FiatOrder ActivityDetails template — extract of prior RampDetails. */
export function RampFiatOrderDetails({
  item,
}: Readonly<{ item: RampFiatActivityListItem }>) {
  const order = item.raw.data;
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
