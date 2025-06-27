import React, { useCallback, useEffect } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import styleSheet from './OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../../../StyledButton';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../../component-library/hooks';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../../reducers';
import { strings } from '../../../../../../../locales/i18n';
import DepositOrderContent from '../../components/DepositOrderContent/DepositOrderContent';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { TRANSAK_SUPPORT_URL } from '../../constants';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';

export interface OrderProcessingParams {
  orderId: string;
}

export const createOrderProcessingNavDetails =
  createNavigationDetails<OrderProcessingParams>(
    Routes.DEPOSIT.ORDER_PROCESSING,
  );

const OrderProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { orderId } = useParams<OrderProcessingParams>();

  const order = useSelector((state: RootState) => getOrderById(state, orderId));

  const [{ error: cancelOrderError }, cancelOrder] = useDepositSdkMethod(
    {
      method: 'cancelOrder',
      onMount: false,
    },
    orderId,
  );

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

  const handleCancelOrder = useCallback(async () => {
    try {
      await cancelOrder();

      if (cancelOrderError) {
        console.error(cancelOrderError);
        return;
      }

      navigation.navigate(Routes.WALLET.HOME);
    } catch (error) {
      console.error(error);
    }
  }, [cancelOrder, cancelOrderError, navigation]);

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

  if (!order) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content grow>
            <View style={styles.errorContainer}>
              <Text variant={TextVariant.BodyMD}>
                {strings('deposit.order_processing.no_order_found')}
              </Text>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <View style={styles.buttonContainer}>
              <StyledButton
                type="confirm"
                onPress={() => navigation.navigate(Routes.WALLET.HOME)}
                testID="no-order-back-button"
              >
                {strings('deposit.order_processing.back_to_wallet')}
              </StyledButton>
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
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
          <View style={styles.buttonContainer}>
            <StyledButton
              type="confirm"
              onPress={handleMainAction}
              testID="main-action-button"
            >
              {order.state === FIAT_ORDER_STATES.CANCELLED ||
              order.state === FIAT_ORDER_STATES.FAILED
                ? strings('deposit.order_processing.error_button')
                : strings('deposit.order_processing.button')}
            </StyledButton>
            {(order.state === FIAT_ORDER_STATES.CANCELLED ||
              order.state === FIAT_ORDER_STATES.FAILED) && (
              <StyledButton type="normal" onPress={handleContactSupport}>
                {strings('deposit.order_processing.contact_support_button')}
              </StyledButton>
            )}
            {order.state === FIAT_ORDER_STATES.CREATED && (
              // TODO: Confirm styling of this button
              <StyledButton type="cancel" onPress={handleCancelOrder}>
                {strings('deposit.order_processing.cancel_order_button')}
              </StyledButton>
            )}
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default OrderProcessing;
