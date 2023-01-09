import React, { useCallback } from 'react';
import { StyleSheet, SafeAreaView, View, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { Payment, PaymentType } from '@consensys/on-ramp-sdk';

import Text from '../../../Base/Text';
import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../Base/ModalDragger';
import PaymentMethod from './PaymentMethod';

import useAnalytics from '../hooks/useAnalytics';
import { useTheme } from '../../../../util/theme';
import { Colors } from '../../../../util/theme/models';
import { ScreenLocation } from '../types';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalView: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      flex: 0.75,
    },
    resultsView: {
      marginTop: 0,
      flex: 1,
    },
    content: {
      paddingTop: 0,
    },
    row: {
      marginVertical: 8,
    },
  });

interface Props {
  isVisible: boolean;
  dismiss: () => void;
  title?: string;
  onItemPress: (paymentMethodId?: Payment['id']) => void;
  paymentMethods?: Payment[] | null;
  selectedPaymentMethodId: Payment['id'] | null;
  selectedPaymentMethodType: PaymentType | undefined;
  location?: ScreenLocation;
}

function PaymentMethodModal({
  isVisible,
  dismiss,
  title,
  onItemPress,
  paymentMethods,
  selectedPaymentMethodId,
  location,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const trackEvent = useAnalytics();

  const handleOnPressItemCallback = useCallback(
    (paymentMethodId) => {
      if (selectedPaymentMethodId !== paymentMethodId) {
        onItemPress(paymentMethodId);
        trackEvent('ONRAMP_PAYMENT_METHOD_SELECTED', {
          payment_method_id: paymentMethodId,
          location,
        });
      } else {
        onItemPress();
      }
    },
    [location, onItemPress, selectedPaymentMethodId, trackEvent],
  );

  const selectedPaymentMethod = paymentMethods?.find(
    ({ id }) => id === selectedPaymentMethodId,
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      style={styles.modal}
    >
      <SafeAreaView style={styles.modalView}>
        <ModalDragger />
        <ScreenLayout>
          <ScreenLayout.Header bold title={title}></ScreenLayout.Header>

          <ScreenLayout.Body>
            <ScrollView>
              <View style={styles.resultsView}>
                <ScreenLayout.Content style={styles.content}>
                  {paymentMethods?.map((payment) => (
                    <View key={payment.id} style={styles.row}>
                      <PaymentMethod
                        payment={payment}
                        highlighted={payment.id === selectedPaymentMethodId}
                        onPress={() => handleOnPressItemCallback(payment.id)}
                        compact
                      />
                    </View>
                  ))}

                  {selectedPaymentMethod?.disclaimer ? (
                    <Text small grey centered>
                      {selectedPaymentMethod?.disclaimer}
                    </Text>
                  ) : null}
                </ScreenLayout.Content>
              </View>
            </ScrollView>
          </ScreenLayout.Body>
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}

export default PaymentMethodModal;
