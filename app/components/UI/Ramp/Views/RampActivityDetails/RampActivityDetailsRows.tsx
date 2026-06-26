import React from 'react';
import { SectionDivider } from '@metamask/design-system-react-native';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import { strings } from '../../../../../../locales/i18n';
import {
  isRampSellOrder,
  mapRampActivityStatus,
  valueOrUnavailable,
} from './RampActivityDetails.utils';
import { RampActivityTransactionIdValue } from './RampActivityTransactionIdValue';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from '../../../../Views/ActivityDetails/components/ActivityDetailsLayout';
import { ActivityDetailsAccountValue } from '../../../../Views/ActivityDetails/components/ActivityDetailsAccountValue';
import { ActivityDetailsStatus } from '../../../../Views/ActivityDetails/components/ActivityDetailsStatus';

interface RampActivityDetailsRowsProps {
  chainId: string;
  fiatValue?: string;
  formattedDate: string;
  order: FiatOrder;
  providerName: string;
  totalReceived?: string;
  transactionFee?: string;
  transactionHash?: string;
}

export function RampActivityDetailsRows({
  chainId,
  fiatValue,
  formattedDate,
  order,
  providerName,
  totalReceived,
  transactionFee,
  transactionHash,
}: RampActivityDetailsRowsProps) {
  const isSell = isRampSellOrder(order);

  return (
    <>
      <ActivityDetailSection>
        <ActivityDetailRow
          label={strings('activity_details.status')}
          value={
            <ActivityDetailsStatus status={mapRampActivityStatus(order)} />
          }
        />

        <ActivityDetailRow
          label={strings('activity_details.date')}
          value={formattedDate}
        />

        <ActivityDetailRow
          label={strings('transaction_details.label.order_id')}
          value={order.id}
        />

        <ActivityDetailRow
          label={strings('activity_details.account')}
          value={
            <ActivityDetailsAccountValue
              address={order.account}
              chainId={chainId}
            />
          }
        />

        {isSell ? (
          <ActivityDetailRow label="Destination" value={providerName} />
        ) : null}

        <ActivityDetailRow
          label={strings('activity_details.transaction_id')}
          value={<RampActivityTransactionIdValue hash={transactionHash} />}
        />
      </ActivityDetailSection>

      <SectionDivider marginVertical={3} />
      <ActivityDetailSection>
        {isSell ? (
          <>
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
          </>
        ) : (
          <>
            <ActivityDetailRow
              label={strings('transaction_details.label.transaction_fee')}
              value={valueOrUnavailable(transactionFee)}
            />
            <ActivityDetailRow
              label={strings('transaction_details.label.total_amount')}
              value={valueOrUnavailable(fiatValue)}
            />
          </>
        )}
      </ActivityDetailSection>
    </>
  );
}
