import React, { useCallback, useEffect, useMemo } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import styleSheet from '../../Deposit/Views/OrderProcessing/OrderProcessing.styles';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { getOrderById } from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import DepositOrderContent from '../../Deposit/components/DepositOrderContent/DepositOrderContent';
import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { TRANSAK_SUPPORT_URL } from '../../Deposit/constants';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Loader from '../../../../../component-library/components-temp/Loader/Loader';
import { ORDER_PROCESSING_TEST_IDS } from './OrderProcessing.testIds';

export interface OrderProcessingParams {
  orderId: string;
}

const V2OrderProcessing = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { orderId } = useParams<OrderProcessingParams>();
  const order = useSelector((state: RootState) => getOrderById(state, orderId));

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

  const headerTitle = useMemo(() => {
    if (!order) {
      return strings('deposit.order_processing.title');
    }
    if (order.state === FIAT_ORDER_STATES.COMPLETED) {
      return strings('deposit.order_processing.success_title');
    }
    if (
      order.state === FIAT_ORDER_STATES.CANCELLED ||
      order.state === FIAT_ORDER_STATES.FAILED
    ) {
      return strings('deposit.order_processing.error_title');
    }
    return strings('deposit.order_processing.title');
  }, [order]);

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (order?.state === FIAT_ORDER_STATES.CANCELLED) {
      navigation.navigate(Routes.WALLET.HOME as never);
    }
  }, [order?.state, navigation, orderId]);

  if (!order) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderCompactStandard
            title={headerTitle}
            onBack={handleHeaderBack}
            backButtonProps={{ testID: 'deposit-back-navbar-button' }}
            includesTopInset
          />
          <Loader size="large" color={theme.colors.primary.default} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderCompactStandard
          title={headerTitle}
          onBack={handleHeaderBack}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          includesTopInset
        />
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
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  onPress={handleContactSupport}
                >
                  {strings('deposit.order_processing.contact_support_button')}
                </Button>
              )}
              <Button
                style={styles.button}
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleMainAction}
                testID={ORDER_PROCESSING_TEST_IDS.MAIN_ACTION_BUTTON}
              >
                {order.state === FIAT_ORDER_STATES.CANCELLED ||
                order.state === FIAT_ORDER_STATES.FAILED
                  ? strings('deposit.order_processing.error_button')
                  : strings('deposit.order_processing.button')}
              </Button>
            </View>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default V2OrderProcessing;
