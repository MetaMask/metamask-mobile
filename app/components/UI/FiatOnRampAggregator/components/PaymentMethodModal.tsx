import React, { useCallback } from 'react';
import { StyleSheet, SafeAreaView, View, ScrollView } from 'react-native';
import Modal from 'react-native-modal';

import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../Base/ModalDragger';
import PaymentOption from './PaymentOption';

import { useTheme } from '../../../../util/theme';
import { getPaymentMethodIcon } from '../utils';
import BaseText from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';
import { Colors } from '../../../../util/theme/models';
import { Payment } from '@consensys/on-ramp-sdk';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;

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
}

function PaymentMethodModal({
  isVisible,
  dismiss,
  title,
  onItemPress,
  paymentMethods,
  selectedPaymentMethodId,
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleOnPressItemCallback = useCallback(
    (paymentMethodId) => {
      if (selectedPaymentMethodId !== paymentMethodId) {
        onItemPress(paymentMethodId);
      } else {
        onItemPress();
      }
    },
    [onItemPress, selectedPaymentMethodId],
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
                  {paymentMethods?.map(({ id, name, delay, amountTier }) => (
                    <View key={id} style={styles.row}>
                      <PaymentOption
                        highlighted={id === selectedPaymentMethodId}
                        title={name}
                        time={delay}
                        id={id}
                        onPress={() => handleOnPressItemCallback(id)}
                        amountTier={amountTier}
                        paymentType={getPaymentMethodIcon(id)}
                      />
                    </View>
                  ))}

                  <Text small grey centered>
                    {selectedPaymentMethodId === '/payments/apple-pay' &&
                      strings(
                        'fiat_on_ramp_aggregator.payment_method.apple_cash_not_supported',
                      )}
                    {selectedPaymentMethodId ===
                      '/payments/debit-credit-card' &&
                      strings(
                        'fiat_on_ramp_aggregator.payment_method.card_fees',
                      )}
                  </Text>
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
