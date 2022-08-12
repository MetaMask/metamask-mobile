import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Image } from 'react-native';

import { strings } from '../../../../../locales/i18n';

import PaymentMethod from '../components/PaymentMethod';

import Text from '../../../Base/Text';
import Title from '../components/Title';
import { useAssetFromTheme } from '../../../../util/theme';

const styles = StyleSheet.create({
  title: {
    flex: 1,
    flexWrap: 'wrap',
  },
  applePay: {
    marginVertical: 3,
    marginLeft: 5,
    marginBottom: '-3%',
  },
});

/* eslint-disable import/no-commonjs */
const ApplePayMarkLightIcon = require('../../../../images/ApplePayMark-light.png');
const ApplePayMarkDarkIcon = require('../../../../images/ApplePayMark-dark.png');
const WyreLogoLightIcon = require('../../../../images/WyreLogo-light.png');
const WyreLogoDarkIcon = require('../../../../images/WyreLogo-dark.png');
/* eslint-enable import/no-commonjs */

const ApplePayMark = () => {
  const applePayMarkIcon = useAssetFromTheme(
    ApplePayMarkLightIcon,
    ApplePayMarkDarkIcon,
  );
  return <Image source={applePayMarkIcon} style={styles.applePay} />;
};
const WyreLogo = () => {
  const wyreLogoIcon = useAssetFromTheme(WyreLogoLightIcon, WyreLogoDarkIcon);
  return <Image source={wyreLogoIcon} style={styles.wyre} />;
};

const WyreApplePayPaymentMethod = ({ onPress }) => (
  <PaymentMethod onPress={onPress}>
    <PaymentMethod.Content>
      <PaymentMethod.Details>
        <PaymentMethod.Title>
          <Text reset style={styles.title}>
            <Title>{strings('fiat_on_ramp.apple_pay')}</Title>{' '}
            <Text>{strings('fiat_on_ramp.via')}</Text> <WyreLogo />
          </Text>
          <ApplePayMark />
        </PaymentMethod.Title>
        <Text bold>{strings('fiat_on_ramp.fast_no_registration')}</Text>
        <Text>{strings('fiat_on_ramp.debit_credit_card_required')}</Text>

        <PaymentMethod.InfoIconLine>
          <Text>
            <Text small>{strings('fiat_on_ramp.wyre_countries')}</Text>
          </Text>
        </PaymentMethod.InfoIconLine>
      </PaymentMethod.Details>
    </PaymentMethod.Content>
  </PaymentMethod>
);

WyreApplePayPaymentMethod.propTypes = {
  onPress: PropTypes.func,
};
WyreApplePayPaymentMethod.defaultProps = {
  onPress: undefined,
};
export default WyreApplePayPaymentMethod;
