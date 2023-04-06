import React from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet } from 'react-native';
import ListItem from '../../Base/ListItem';
import { strings } from '../../../../locales/i18n';
import { toDateFormat } from '../../../util/date';
import {
  renderNumber,
  addCurrencySymbol,
  renderFiat,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../util/number';
import { getProviderName } from '../../../reducers/fiatOrders';
import StatusText from '../../Base/StatusText';
/**
 * @typedef {import('../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

// eslint-disable-next-line import/no-commonjs
const transactionIconReceived = require('../../../images/transaction-icons/receive.png');

const styles = StyleSheet.create({
  icon: {
    width: 28,
    height: 28,
  },
});

/**
 *
 * @param {object} props
 * @param {FiatOrder} props.order
 */
function OrderListItem({ order }) {
  let amount = '...';
  if (order.cryptoAmount) {
    if (
      order.data?.cryptoCurrency?.decimals !== undefined &&
      order.cryptocurrency
    ) {
      amount = renderFromTokenMinimalUnit(
        toTokenMinimalUnit(
          order.cryptoAmount,
          order.data.cryptoCurrency.decimals,
        ).toString(),
        order.data.cryptoCurrency.decimals,
      );
    } else {
      amount = renderNumber(String(order.cryptoAmount));
    }
  }
  return (
    <ListItem>
      {order.createdAt && (
        <ListItem.Date>{toDateFormat(order.createdAt)}</ListItem.Date>
      )}
      <ListItem.Content>
        <ListItem.Icon>
          <Image
            source={transactionIconReceived}
            style={styles.icon}
            resizeMode="stretch"
          />
        </ListItem.Icon>

        <ListItem.Body>
          <ListItem.Title>
            {getProviderName(order.provider, order.data)}:{' '}
            {strings('fiat_on_ramp.purchased_currency', {
              currency: order.cryptocurrency,
            })}
          </ListItem.Title>
          <StatusText status={order.state} context={'fiat_on_ramp'} />
        </ListItem.Body>
        <ListItem.Amounts>
          <ListItem.Amount>
            {amount} {order.cryptocurrency}
          </ListItem.Amount>
          <ListItem.FiatAmount>
            {addCurrencySymbol(renderFiat(order.amount, ''), order.currency)}
          </ListItem.FiatAmount>
        </ListItem.Amounts>
      </ListItem.Content>
    </ListItem>
  );
}

OrderListItem.propTypes = {
  order: PropTypes.object,
};

export default OrderListItem;
