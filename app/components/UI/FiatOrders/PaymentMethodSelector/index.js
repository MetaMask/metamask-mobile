import React, { useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { connect } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { getTicker } from '../../../../util/transactions';
import {
  FIAT_ORDER_PROVIDERS,
  PAYMENT_CATEGORY,
  PAYMENT_RAILS,
} from '../../../../constants/on-ramp';

import {
  isTransakAllowedToBuy,
  useTransakFlowURL,
} from '../orderProcessor/transak';
import {
  isMoonpayAllowedToBuy,
  useMoonPayFlowURL,
} from '../orderProcessor/moonpay';
import { isWyreAllowedToBuy } from '../orderProcessor/wyreApplePay';
import { getPaymentSelectorMethodNavbar } from '../../Navbar';

import ScreenView from '../components/ScreenView';
import Heading from '../components/Heading';

import Text from '../../../Base/Text';
import Title from '../components/Title';

import TransakPaymentMethod from './transak';
import MoonPayPaymentMethod from './moonpay';
import WyreApplePayPaymentMethod from './wyreApplePay';
import { setGasEducationCarouselSeen } from '../../../../actions/user';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';
import Device from '../../../../util/device';

function PaymentMethodSelectorView({
  selectedAddress,
  chainId,
  ticker,
  gasEducationCarouselSeen,
  setGasEducationCarouselSeen,
  ...props
}) {
  const navigation = useNavigation();
  const transakURL = useTransakFlowURL(selectedAddress, chainId);
  const getSignedMoonPayURL = useMoonPayFlowURL(selectedAddress, chainId);

  const { colors } = useAppThemeFromContext() || mockTheme;

  useEffect(() => {
    navigation.setOptions(
      getPaymentSelectorMethodNavbar(
        navigation,
        () => {
          InteractionManager.runAfterInteractions(() => {
            AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_CLOSED);
          });
        },
        colors,
      ),
    );
  }, [navigation, colors]);

  const onPressWyreApplePay = useCallback(() => {
    const goToApplePay = () => navigation.navigate('PaymentMethodApplePay');
    if (!gasEducationCarouselSeen) {
      navigation.navigate('GasEducationCarousel', {
        navigateTo: goToApplePay,
      });
      setGasEducationCarouselSeen();
    } else {
      goToApplePay();
    }

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED,
        {
          payment_rails: PAYMENT_RAILS.APPLE_PAY,
          payment_category: PAYMENT_CATEGORY.CARD_PAYMENT,
          'on-ramp_provider': FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY,
        },
      );
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_APPLE_PAY);
    });
  }, [navigation, gasEducationCarouselSeen, setGasEducationCarouselSeen]);

  const onPressTransak = useCallback(() => {
    const goToTransakFlow = () =>
      navigation.navigate('TransakFlow', {
        url: transakURL,
        title: strings('fiat_on_ramp.transak_webview_title'),
      });

    if (!gasEducationCarouselSeen) {
      navigation.navigate('GasEducationCarousel', {
        navigateTo: goToTransakFlow,
      });
      setGasEducationCarouselSeen();
    } else {
      goToTransakFlow();
    }

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED,
        {
          payment_rails: PAYMENT_RAILS.MULTIPLE,
          payment_category: PAYMENT_CATEGORY.MULTIPLE,
          'on-ramp_provider': FIAT_ORDER_PROVIDERS.TRANSAK,
        },
      );
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
    });
  }, [
    navigation,
    transakURL,
    gasEducationCarouselSeen,
    setGasEducationCarouselSeen,
  ]);

  const onPressMoonPay = useCallback(() => {
    const goToMoonPayFlow = async () => {
      const signedUrl = await getSignedMoonPayURL();
      navigation.navigate('MoonPayFlow', {
        url: signedUrl,
        title: strings('fiat_on_ramp.moonpay_webview_title'),
      });
    };

    if (!gasEducationCarouselSeen) {
      navigation.navigate('GasEducationCarousel', {
        navigateTo: goToMoonPayFlow,
      });
      setGasEducationCarouselSeen();
    } else {
      goToMoonPayFlow();
    }

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.ONRAMP_PURCHASE_STARTED,
        {
          payment_rails: PAYMENT_RAILS.MULTIPLE,
          payment_category: PAYMENT_CATEGORY.MULTIPLE,
          'on-ramp_provider': FIAT_ORDER_PROVIDERS.MOONPAY,
        },
      );
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.PAYMENTS_SELECTS_DEBIT_OR_ACH);
    });
  }, [
    gasEducationCarouselSeen,
    getSignedMoonPayURL,
    navigation,
    setGasEducationCarouselSeen,
  ]);

  return (
    <ScreenView>
      <Heading>
        <Title centered hero>
          <Text reset>
            {strings('fiat_on_ramp.purchase_method_title.first_line')}
          </Text>
          {'\n'}
          <Text reset>
            {strings('fiat_on_ramp.purchase_method_title.second_line')}
          </Text>
        </Title>
      </Heading>
      {Device.isIos() && isWyreAllowedToBuy(chainId) && (
        <WyreApplePayPaymentMethod onPress={onPressWyreApplePay} />
      )}
      {isTransakAllowedToBuy(chainId) && (
        <TransakPaymentMethod
          onPress={onPressTransak}
          ticker={getTicker(ticker)}
          chainId={chainId}
        />
      )}
      {isMoonpayAllowedToBuy(chainId) && (
        <MoonPayPaymentMethod
          onPress={onPressMoonPay}
          ticker={getTicker(ticker)}
          chainId={chainId}
        />
      )}
    </ScreenView>
  );
}

PaymentMethodSelectorView.propTypes = {
  selectedAddress: PropTypes.string.isRequired,
  chainId: PropTypes.string.isRequired,
  ticker: PropTypes.string,
  gasEducationCarouselSeen: PropTypes.bool,
  setGasEducationCarouselSeen: PropTypes.func,
};

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  gasEducationCarouselSeen: state.user.gasEducationCarouselSeen,
});

const mapDispatchToProps = (dispatch) => ({
  setGasEducationCarouselSeen: () => dispatch(setGasEducationCarouselSeen()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PaymentMethodSelectorView);
