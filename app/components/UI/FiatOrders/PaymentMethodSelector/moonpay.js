import React from 'react';
import PropTypes from 'prop-types';
import { Image, StyleSheet } from 'react-native';
import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';
import Title from '../../../Base/Title';
import Text from '../../../Base/Text';
import { useAssetFromTheme } from '../../../../util/theme';
import { NETWORKS_CHAIN_ID } from '../../../../constants/on-ramp';

const styles = StyleSheet.create({
  title: {
    flex: 1,
    flexWrap: 'wrap',
  },
  logo: {
    marginVertical: 5,
    aspectRatio: 137.18 / 25,
    width: 109.75,
    height: 20,
    marginLeft: 5,
  },
});

/* eslint-disable import/no-commonjs */
const MoonPayLogoLightIcon = require('../../../../images/MoonPayLogo-light.png');
const MoonPayLogoDarkIcon = require('../../../../images/MoonPayLogo-dark.png');
/* eslint-enable import/no-commonjs */

const MoonPayLogo = () => {
  const moonPayLogoIcon = useAssetFromTheme(
    MoonPayLogoLightIcon,
    MoonPayLogoDarkIcon,
  );
  return <Image source={moonPayLogoIcon} style={styles.logo} />;
};

const hasStablecoins = (chainId) =>
  [
    NETWORKS_CHAIN_ID.MAINNET,
    NETWORKS_CHAIN_ID.BSC,
    NETWORKS_CHAIN_ID.POLYGON,
    NETWORKS_CHAIN_ID.CELO,
  ].includes(chainId);

const MoonPayPaymentMethod = ({ onPress, ticker, chainId }) => (
  <PaymentMethod onPress={onPress}>
    <PaymentMethod.Content>
      <PaymentMethod.Details>
        <PaymentMethod.Title>
          <Title style={styles.title}>
            {hasStablecoins(chainId)
              ? strings('fiat_on_ramp.buy_ticker_stablecoins', { ticker })
              : strings('fiat_on_ramp.buy_ticker', { ticker })}
          </Title>
          <MoonPayLogo />
        </PaymentMethod.Title>
        <Text bold>{strings('fiat_on_ramp.multiple_payment_methods')}</Text>
        <Text>
          {strings('fiat_on_ramp.debit_credit_bank_transfers_country')}
        </Text>

        <PaymentMethod.InfoIconLine>
          <Text small>{strings('fiat_on_ramp.moonpay_options_fees_vary')}</Text>
        </PaymentMethod.InfoIconLine>
      </PaymentMethod.Details>
    </PaymentMethod.Content>
  </PaymentMethod>
);

MoonPayPaymentMethod.propTypes = {
  onPress: PropTypes.func,
  ticker: PropTypes.string,
  chainId: PropTypes.string,
};
MoonPayPaymentMethod.defaultProps = {
  onPress: undefined,
};

export default MoonPayPaymentMethod;
