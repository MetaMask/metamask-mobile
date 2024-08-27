import React from 'react';
import { Image } from 'react-native';

import createStyles from './OrderListItem.styles';
import BaseListItem from '../../../../Base/ListItem';

import { FiatOrder, getProviderName } from '../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../locales/i18n';
import { toDateFormat } from '../../../../../util/date';
import { addCurrencySymbol, renderFiat } from '../../../../../util/number';
import { getOrderAmount } from '../../utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

// TODO: Convert into typescript and correctly type optionals
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListItem = BaseListItem as any;

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const transactionIconReceived = require('../../../../../images/transaction-icons/receive.png');
const transactionIconSent = require('../../../../../images/transaction-icons/receive-inverted.png');
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
  const [statusColor, statusText] = getStatusColorAndText(order);

  return (
    <ListItem>
      {Boolean(order.createdAt) && (
        <ListItem.Date>{toDateFormat(order.createdAt)}</ListItem.Date>
      )}
      <ListItem.Content>
        <ListItem.Icon>
          <Image
            source={isBuy ? transactionIconReceived : transactionIconSent}
            style={styles.icon}
            resizeMode="stretch"
          />
        </ListItem.Icon>

        <ListItem.Body>
          <ListItem.Title>
            {getProviderName(order.provider, order.data)}:{' '}
            {strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.purchased_currency'
                : 'fiat_on_ramp_aggregator.sold_currency',
              {
                currency: order.cryptocurrency,
              },
            )}
          </ListItem.Title>
          <Text variant={TextVariant.BodySMBold} color={statusColor}>
            {statusText}
          </Text>
        </ListItem.Body>
        <ListItem.Amounts>
          <ListItem.Amount>
            {amount} {order.cryptocurrency}
          </ListItem.Amount>
          <ListItem.FiatAmount>
            {order.amount == null
              ? '...'
              : addCurrencySymbol(
                  renderFiat(Number(order.amount), ''),
                  order.currency,
                )}
          </ListItem.FiatAmount>
        </ListItem.Amounts>
      </ListItem.Content>
    </ListItem>
  );
}

export default OrderListItem;
