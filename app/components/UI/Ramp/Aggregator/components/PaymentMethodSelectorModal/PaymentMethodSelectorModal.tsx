import React, { useCallback, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { Payment, PaymentType } from '@consensys/on-ramp-sdk';

import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';

import PaymentMethod from '../PaymentMethod';
import useAnalytics from '../../../hooks/useAnalytics';
import { RampType, Region, ScreenLocation } from '../../types';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';

import styleSheet from './PaymentMethodSelectorModal.styles';

interface PaymentMethodSelectorModalParams {
  title?: string;
  onItemPress: (paymentMethodId?: Payment['id']) => void;
  paymentMethods?: Payment[] | null;
  selectedPaymentMethodId: Payment['id'] | null;
  selectedPaymentMethodType: PaymentType | undefined;
  selectedRegion?: Region | null;
  location?: ScreenLocation;
  rampType: RampType;
}

export const createPaymentMethodSelectorModalNavigationDetails =
  createNavigationDetails<PaymentMethodSelectorModalParams>(
    Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR,
  );

function PaymentMethodSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const {
    title,
    onItemPress,
    paymentMethods,
    selectedPaymentMethodId,
    selectedRegion,
    location,
    rampType,
  } = useParams<PaymentMethodSelectorModalParams>();

  const { styles } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const isBuy = rampType === RampType.BUY;

  const handleOnPressItemCallback = useCallback(
    (paymentMethodId?: Payment['id']) => {
      trackEvent('RAMP_PAYMENT_METHOD_SELECTED', {
        payment_method_id: paymentMethodId as string,
        location,
        region: selectedRegion?.id,
      });

      sheetRef.current?.onCloseBottomSheet(() => {
        onItemPress(paymentMethodId);
      });
    },
    [onItemPress, trackEvent, location, selectedRegion?.id],
  );

  const selectedPaymentMethod = paymentMethods?.find(
    ({ id }) => id === selectedPaymentMethodId,
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
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
