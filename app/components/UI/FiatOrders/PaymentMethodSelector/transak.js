import React from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';

import Device from '../../../../util/device';
import { NETWORKS_CHAIN_ID } from '../../../../constants/on-ramp';

const styles = StyleSheet.create({
  title: {
    flex: 1,
    flexWrap: 'wrap',
  },
  logo: {
    marginVertical: 5,
    aspectRatio: 95 / 25,
    width: Device.isIphone5() ? 80 : 95,
    height: Device.isIphone5() ? 20 : 25,
    marginLeft: 5,
  },
});

// eslint-disable-next-line import/no-commonjs
const TransakLogoIcon = require('../../../../images/TransakLogo.png');
const TransakLogo = () => (
  <Image source={TransakLogoIcon} style={styles.logo} />
);

const hasStablecoins = (chainId) =>
  [
    NETWORKS_CHAIN_ID.MAINNET,
    NETWORKS_CHAIN_ID.BSC,
    NETWORKS_CHAIN_ID.POLYGON,
    NETWORKS_CHAIN_ID.CELO,
  ].includes(chainId);

const TransakPaymentMethod = ({ onPress, ticker, chainId }) => (
  <PaymentMethod onPress={onPress}>
    <PaymentMethod.Content>
      <PaymentMethod.Details>
        <PaymentMethod.Title>
          <Title style={styles.title}>
            {hasStablecoins(chainId)
              ? strings('fiat_on_ramp.buy_ticker_stablecoins', { ticker })
              : strings('fiat_on_ramp.buy_ticker', { ticker })}
          </Title>
          <TransakLogo />
        </PaymentMethod.Title>
        <Text bold>{strings('fiat_on_ramp.multiple_payment_methods')}</Text>
        <Text>
          {strings('fiat_on_ramp.debit_credit_bank_transfers_country')}
        </Text>

        <PaymentMethod.InfoIconLine>
          <Text small>{strings('fiat_on_ramp.options_fees_vary')}</Text>
        </PaymentMethod.InfoIconLine>
      </PaymentMethod.Details>
    </PaymentMethod.Content>
  </PaymentMethod>
);

TransakPaymentMethod.propTypes = {
  onPress: PropTypes.func,
  ticker: PropTypes.string,
  chainId: PropTypes.string,
};
TransakPaymentMethod.defaultProps = {
  onPress: undefined,
};

export default TransakPaymentMethod;
