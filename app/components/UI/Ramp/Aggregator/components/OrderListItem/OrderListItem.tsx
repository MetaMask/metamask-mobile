import React from 'react';
import { Image } from 'react-native';
import { isCaipChainId, toCaipChainId } from '@metamask/utils';

import createStyles from './OrderListItem.styles';
import {
  FiatOrder,
  getProviderName,
} from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { toDateFormat } from '../../../../../../util/date';
import { addCurrencySymbol, renderFiat } from '../../../../../../util/number';
import { getOrderAmount } from '../../utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import ListItemColumnEnd from '../ListItemColumnEnd';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../../util/networks';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const transactionIconReceived = require('images/transaction-icons/receive.png');
const transactionIconSent = require('images/transaction-icons/receive-inverted.png');
/* eslint-enable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

interface Props {
  readonly order: FiatOrder;
}

function getStatusColorAndText(order: FiatOrder): [TextColor, string] {
  let statusColor;
  switch (order.state) {
    case 'CANCELLED':
    case 'FAILED':
      statusColor = TextColor.Error;
      break;
    case 'COMPLETED':
      statusColor = TextColor.Success;
      break;
    case 'PENDING':
      statusColor = TextColor.Primary;
      break;
    case 'CREATED':
    default:
      statusColor = TextColor.Default;
      break;
  }

  let statusText;
  switch (order.state) {
    case 'CANCELLED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_cancelled');
      break;
    case 'FAILED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_failed');
      break;
    case 'COMPLETED':
      statusText = strings('fiat_on_ramp_aggregator.order_status_completed');
      break;
    case 'PENDING':
      statusText =
        order.orderType === 'BUY'
          ? strings('fiat_on_ramp_aggregator.order_status_pending')
          : strings('fiat_on_ramp_aggregator.order_status_processing');
      break;
    case 'CREATED':
    default:
      statusText = strings('fiat_on_ramp_aggregator.order_status_pending');
      break;
  }

  return [statusColor, statusText];
}

function OrderListItem({ order }: Props) {
  const styles = createStyles();
  const amount = getOrderAmount(order);
  const isBuy = order.orderType === 'BUY';
  const isDeposit = order.provider === 'DEPOSIT';
  const isPurchase = isBuy || isDeposit;
  const [statusColor, statusText] = getStatusColorAndText(order);

  const aggregatorTitleKey = isBuy
    ? 'fiat_on_ramp_aggregator.purchased_currency'
    : 'fiat_on_ramp_aggregator.sold_currency';

  const caipChainId = isCaipChainId(order.network)
    ? order.network
    : toCaipChainId('eip155', order.network);

  return (
    <ListItem
      topAccessory={
        <Text variant={TextVariant.BodySM}>
          {toDateFormat(order.createdAt)}
        </Text>
      }
      topAccessoryGap={10}
    >
      <ListItemColumn>
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={getNetworkImageSource({
                chainId: caipChainId,
              })}
            />
          }
        >
          <Image
            source={isPurchase ? transactionIconReceived : transactionIconSent}
            style={styles.icon}
            resizeMode="stretch"
          />
        </BadgeWrapper>
      </ListItemColumn>

      <ListItemColumn widthType={WidthType.Fill}>
        <Text variant={TextVariant.BodyMD}>
          {isDeposit
            ? strings('fiat_on_ramp_aggregator.deposit_order_title', {
                currency: order.cryptocurrency,
              })
            : `${getProviderName(order.provider, order.data)}: ${strings(
                aggregatorTitleKey,
                {
                  currency: order.cryptocurrency,
                },
              )}`}
        </Text>
        <Text variant={TextVariant.BodySMBold} color={statusColor}>
          {statusText}
        </Text>
      </ListItemColumn>

      <ListItemColumnEnd>
        <Text variant={TextVariant.BodyMD}>
          {amount} {order.cryptocurrency}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {order.amount == null
            ? '...'
            : addCurrencySymbol(
                renderFiat(Number(order.amount), ''),
                order.currency,
              )}
        </Text>
      </ListItemColumnEnd>
    </ListItem>
  );
}

export default OrderListItem;
