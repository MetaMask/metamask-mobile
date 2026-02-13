import React, { useCallback, useEffect } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import styleSheet from '../../Deposit/Views/OrderProcessing/OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import { getOrderById } from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import DepositOrderContent from '../../Deposit/components/DepositOrderContent/DepositOrderContent';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { TRANSAK_SUPPORT_URL } from '../../Deposit/constants';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';

export interface OrderProcessingParams {
  orderId: string;
}

const V2OrderProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { orderId } = useParams<OrderProcessingParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, orderId),
  );

  const handleMainAction = useCallback(() => {
    if (
      order?.state === FIAT_ORDER_STATES.CANCELLED ||
      order?.state === FIAT_ORDER_STATES.FAILED
    ) {
      navigation.navigate(Routes.RAMP.AMOUNT_INPUT as never);
    } else {
      navigation.navigate(Routes.WALLET.HOME as never);
    }
  }, [order?.state, navigation]);

  const handleContactSupport = useCallback(() => {
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
      navigation.navigate(Routes.WALLET.HOME as never);
    }
  }, [order?.state, navigation, orderId]);

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

export default V2OrderProcessing;
