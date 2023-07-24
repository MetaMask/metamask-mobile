import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { toDateFormat } from '../../../util/date';
import { strings } from '../../../../locales/i18n';

import Text from '../../Base/Text';
import StatusText from '../../Base/StatusText';
import DetailsModal from '../../Base/DetailsModal';
import EthereumAddress from '../../UI/EthereumAddress';
import { getProviderName } from '../../../reducers/fiatOrders';
import Summary from '../../Base/Summary';
import { addCurrencySymbol, renderNumber } from '../../../util/number';

const styles = StyleSheet.create({
  summary: {
    marginTop: 8,
    marginBottom: 16,
  },
});

function OrderDetails({ order: { ...order }, closeModal }) {
  return (
    <DetailsModal>
      <DetailsModal.Header>
        <DetailsModal.Title>
          {strings('fiat_on_ramp.purchased_currency', {
            currency: order.cryptocurrency,
          })}
        </DetailsModal.Title>
        <DetailsModal.CloseIcon onPress={closeModal} />
      </DetailsModal.Header>
      <DetailsModal.Body>
        <DetailsModal.Section borderBottom>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle>
              {strings('fiat_on_ramp.status')}
            </DetailsModal.SectionTitle>
            <StatusText status={order.state} context="fiat_on_ramp" />
          </DetailsModal.Column>
          <DetailsModal.Column end>
            <DetailsModal.SectionTitle>
              {strings('fiat_on_ramp.date')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              {toDateFormat(order.createdAt)}
            </Text>
          </DetailsModal.Column>
        </DetailsModal.Section>
        <DetailsModal.Section borderBottom={!!order.cryptoAmount}>
          <DetailsModal.Column>
            <DetailsModal.SectionTitle>
              {strings('fiat_on_ramp.from')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              {getProviderName(order.provider, order.data)}
            </Text>
          </DetailsModal.Column>
          <DetailsModal.Column end>
            <DetailsModal.SectionTitle>
              {strings('fiat_on_ramp.to')}
            </DetailsModal.SectionTitle>
            <Text small primary>
              <EthereumAddress type="short" address={order.account} />
            </Text>
          </DetailsModal.Column>
        </DetailsModal.Section>
        {!!order.cryptoAmount && (
          <DetailsModal.Section>
            <DetailsModal.Column>
              <DetailsModal.SectionTitle>
                {strings('fiat_on_ramp.amount')}
              </DetailsModal.SectionTitle>
              <Text primary bold small>
                {renderNumber(String(order.cryptoAmount))}{' '}
                {order.cryptocurrency}
              </Text>
            </DetailsModal.Column>
          </DetailsModal.Section>
        )}
        {Number.isFinite(order.amount) && Number.isFinite(order.fee) && (
          <Summary style={styles.summary}>
            <Summary.Row>
              <Text primary small>
                {strings('fiat_on_ramp.amount')}
              </Text>
              <Text primary small>
                {addCurrencySymbol(
                  (order.amount - order.fee).toLocaleString(),
                  order.currency,
                )}
              </Text>
            </Summary.Row>
            <Summary.Row>
              <Text primary small>
                {strings('fiat_on_ramp.Fee')}
              </Text>
              <Text primary small>
                {addCurrencySymbol(order.fee.toLocaleString(), order.currency)}
              </Text>
            </Summary.Row>
            <Summary.Separator />
            <Summary.Row>
              <Text primary small bold>
                {strings('fiat_on_ramp.total_amount')}
              </Text>
              <Text primary small bold>
                {addCurrencySymbol(
                  order.amount.toLocaleString(),
                  order.currency,
                )}
              </Text>
            </Summary.Row>
          </Summary>
        )}
      </DetailsModal.Body>
    </DetailsModal>
  );
}

OrderDetails.propTypes = {
  order: PropTypes.object,
  closeModal: PropTypes.func,
};

export default OrderDetails;
