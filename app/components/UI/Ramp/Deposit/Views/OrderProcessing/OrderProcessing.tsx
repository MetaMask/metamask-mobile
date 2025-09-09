import React, { useCallback, useEffect } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import styleSheet from './OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp , StackScreenProps } from '@react-navigation/stack';
import type { NavigatableRootParamList , RootParamList } from '../../../../../../util/navigation/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../../reducers';
import { strings } from '../../../../../../../locales/i18n';
import DepositOrderContent from '../../components/DepositOrderContent/DepositOrderContent';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { TRANSAK_SUPPORT_URL } from '../../constants';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Loader from '../../../../../../component-library/components-temp/Loader/Loader';
import useAnalytics from '../../../hooks/useAnalytics';
import { useDepositSDK } from '../../sdk';
import {
  getCryptoCurrencyFromTransakId,
  hasDepositOrderField,
} from '../../utils';
import { DepositOrder } from '@consensys/native-ramps-sdk';

type OrderProcessingProps = StackScreenProps<RootParamList, 'OrderProcessing'>;

const OrderProcessing = ({ route }: OrderProcessingProps) => {
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'OrderProcessing'>
    >();
  const { styles, theme } = useStyles(styleSheet, {});
  const { orderId } = route.params;
  const order = useSelector((state: RootState) => getOrderById(state, orderId));
  const trackEvent = useAnalytics();
  const { selectedWalletAddress, selectedRegion } = useDepositSDK();

  const handleMainAction = useCallback(() => {
    if (
      order?.state === FIAT_ORDER_STATES.CANCELLED ||
      order?.state === FIAT_ORDER_STATES.FAILED
    ) {
      navigation.navigate(Routes.DEPOSIT.BUILD_QUOTE);
    } else {
      navigation.navigate(Routes.WALLET.HOME);
    }
  }, [order?.state, navigation]);

  const handleContactSupport = useCallback(() => {
    // TODO: Discuss proper support feature
    Linking.openURL(TRANSAK_SUPPORT_URL);
  }, []);

  useEffect(() => {
    const title =
      order?.state === FIAT_ORDER_STATES.COMPLETED
        ? strings('deposit.order_processing.success_title')
        : order?.state === FIAT_ORDER_STATES.CANCELLED ||
          order?.state === FIAT_ORDER_STATES.FAILED
        ? strings('deposit.order_processing.error_title')
        : strings('deposit.order_processing.title');

    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title }, theme),
    );
  }, [navigation, theme, order?.state]);

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CANCELLED) {
      navigation.navigate(Routes.WALLET.HOME);
    }
  }, [order?.state, navigation, orderId]);

  useEffect(() => {
    if (!order) return;

    const isCompleted = order.state === FIAT_ORDER_STATES.COMPLETED;
    const isFailed = order.state === FIAT_ORDER_STATES.FAILED;

    if (isCompleted || isFailed) {
      if (hasDepositOrderField(order.data, 'cryptoCurrency')) {
        const cryptoCurrency = getCryptoCurrencyFromTransakId(
          (order.data as DepositOrder).cryptoCurrency,
          (order.data as DepositOrder).network,
        );

        const baseAnalyticsData = {
          ramp_type: 'DEPOSIT' as const,
          amount_source: Number(order.data.fiatAmount),
          amount_destination: Number(order.cryptoAmount),
          exchange_rate: Number(order.data.exchangeRate),
          payment_method_id: order.data.paymentMethod,
          country: selectedRegion?.isoCode || '',
          chain_id: cryptoCurrency?.chainId || '',
          currency_destination: cryptoCurrency?.assetId || '',
          currency_source: order.data.fiatCurrency,
        };

        if (isCompleted) {
          trackEvent('RAMPS_TRANSACTION_COMPLETED', {
            ...baseAnalyticsData,
            gas_fee: order.data.networkFees
              ? Number(order.data.networkFees)
              : 0,
            processing_fee: order.data.partnerFees
              ? Number(order.data.partnerFees)
              : 0,
            total_fee: Number(order.data.totalFeesFiat),
          });
        } else if (isFailed) {
          trackEvent('RAMPS_TRANSACTION_FAILED', {
            ...baseAnalyticsData,
            gas_fee: order.data.networkFees
              ? Number(order.data.networkFees)
              : 0,
            processing_fee: order.data.partnerFees
              ? Number(order.data.partnerFees)
              : 0,
            total_fee: Number(order.data.totalFeesFiat),
            error_message: order.data.statusDescription || 'transaction_failed',
          });
        }
      }
    }
  }, [
    order,
    navigation,
    orderId,
    trackEvent,
    selectedWalletAddress,
    selectedRegion,
  ]);

  if (!order) {
    return (
      <ScreenLayout>
        <Loader size="large" color={theme.colors.primary.default} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <DepositOrderContent order={order} />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.bottomContainer}>
            <View style={styles.buttonsContainer}>
              {(order.state === FIAT_ORDER_STATES.CANCELLED ||
                order.state === FIAT_ORDER_STATES.FAILED) && (
                <Button
                  style={styles.button}
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Lg}
                  onPress={handleContactSupport}
                  label={strings(
                    'deposit.order_processing.contact_support_button',
                  )}
                />
              )}
              <Button
                style={styles.button}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                onPress={handleMainAction}
                testID="main-action-button"
                label={
                  order.state === FIAT_ORDER_STATES.CANCELLED ||
                  order.state === FIAT_ORDER_STATES.FAILED
                    ? strings('deposit.order_processing.error_button')
                    : strings('deposit.order_processing.button')
                }
              />
            </View>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OrderProcessing;
