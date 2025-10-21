import React, { useCallback, useRef } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Payment } from '@consensys/on-ramp-sdk';
import { useNavigation } from '@react-navigation/native';

import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';

import PaymentMethod from '../PaymentMethod';
import useAnalytics from '../../../hooks/useAnalytics';
import { ScreenLocation } from '../../types';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useRampSDK } from '../../sdk';

import styleSheet from './PaymentMethodSelectorModal.styles';
import { strings } from '../../../../../../../locales/i18n';

interface PaymentMethodSelectorModalParams {
  paymentMethods?: Payment[] | null;
  location?: ScreenLocation;
}

export const createPaymentMethodSelectorModalNavigationDetails =
  createNavigationDetails<PaymentMethodSelectorModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR,
  );

function PaymentMethodSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { paymentMethods, location } =
    useParams<PaymentMethodSelectorModalParams>();

  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const trackEvent = useAnalytics();

  const {
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    selectedRegion,
    isBuy,
  } = useRampSDK();

  const title = strings(
    isBuy
      ? 'fiat_on_ramp_aggregator.select_payment_method'
      : 'fiat_on_ramp_aggregator.select_cash_destination',
  );

  const handleOnPressItemCallback = useCallback(
    (paymentMethodId: Payment['id']) => {
      if (selectedPaymentMethodId !== paymentMethodId) {
        trackEvent(
          isBuy
            ? 'ONRAMP_PAYMENT_METHOD_SELECTED'
            : 'OFFRAMP_PAYMENT_METHOD_SELECTED',
          {
            payment_method_id: paymentMethodId,
            available_payment_method_ids: paymentMethods?.map(
              ({ id }) => id,
            ) as string[],
            region: selectedRegion?.id as string,
            location,
          },
        );

        sheetRef.current?.onCloseBottomSheet(() => {
          setSelectedPaymentMethodId(paymentMethodId);
          navigation.goBack();
        });
      } else {
        sheetRef.current?.onCloseBottomSheet(() => {
          navigation.goBack();
        });
      }
    },
    [
      isBuy,
      location,
      setSelectedPaymentMethodId,
      paymentMethods,
      selectedPaymentMethodId,
      selectedRegion?.id,
      trackEvent,
      navigation,
    ],
  );

  const selectedPaymentMethod = paymentMethods?.find(
    ({ id }) => id === selectedPaymentMethodId,
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack={false}>
      <BottomSheetHeader
        onClose={() =>
          sheetRef.current?.onCloseBottomSheet(() => {
            navigation.goBack();
          })
        }
      >
        <Text variant={TextVariant.HeadingMD}>{title}</Text>
      </BottomSheetHeader>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {paymentMethods?.map((payment) => (
            <View key={payment.id} style={styles.paymentMethodRow}>
              <PaymentMethod
                payment={payment}
                highlighted={payment.id === selectedPaymentMethodId}
                onPress={() => handleOnPressItemCallback(payment.id)}
                compact
                isBuy={isBuy}
              />
            </View>
          ))}

          {selectedPaymentMethod?.disclaimer ? (
            <View style={styles.disclaimerContainer}>
              <Text variant={TextVariant.BodySM} style={styles.disclaimer}>
                {selectedPaymentMethod?.disclaimer}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

export default PaymentMethodSelectorModal;
