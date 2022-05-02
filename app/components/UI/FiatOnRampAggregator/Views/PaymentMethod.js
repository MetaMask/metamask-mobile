import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentOption from '../components/PaymentOption';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import WebviewError from '../../../UI/WebviewError';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { getPaymentMethodIcon } from '../utils';
import Device from '../../../../util/device';

const styles = StyleSheet.create({
  row: {
    marginVertical: 8,
  },
});

const PaymentMethod = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(navigation, { title: 'Payment Method' }, colors),
    );
  }, [navigation, colors]);

  const {
    selectedRegion,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
  } = useFiatOnRampSDK();

  const [{ data: paymentMethods, isFetching, error }] = useSDKMethod(
    'getPaymentMethods',
    selectedRegion?.id,
  );

  const filteredPaymentMethods = useMemo(() => {
    if (paymentMethods) {
      return paymentMethods.filter((paymentMethod) =>
        Device.isAndroid() ? !paymentMethod.isApplePay : true,
      );
    }
    return null;
  }, [paymentMethods]);

  useEffect(() => {
    if (!isFetching && !error && filteredPaymentMethods) {
      const paymentMethod = filteredPaymentMethods.find(
        (pm) => pm.id === selectedPaymentMethodId,
      );
      if (!paymentMethod) {
        setSelectedPaymentMethodId(filteredPaymentMethods?.[0]?.id);
      }
    }
  }, [
    error,
    filteredPaymentMethods,
    isFetching,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
  ]);

  const handleContinueToAmount = useCallback(() => {
    navigation.navigate('AmountToBuy');
  }, [navigation]);

  // TODO: replace this with loading screen
  if (isFetching) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body></ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <WebviewError
        error={{ description: error }}
        onReload={() => navigation.navigate('PaymentMethod')}
      />
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          {filteredPaymentMethods?.map(({ id, name, delay, amountTier }) => (
            <View key={id} style={styles.row}>
              <PaymentOption
                highlighted={id === selectedPaymentMethodId}
                title={name}
                time={delay}
                cardImage={[
                  '/payments/apple-pay',
                  '/payments/debit-credit-card',
                ].includes(id)}
                onPress={() => setSelectedPaymentMethodId(id)}
                amountTier={amountTier}
                paymentType={getPaymentMethodIcon(id)}
                idRequired={false}
              />
            </View>
          ))}
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.row}>
            <Text small grey centered>
              Apple cash lorem ipsum sed ut perspiciatis unde omnis iste natus
              error sit voluptatem sed ut perspiciatis
            </Text>
          </View>
          <View style={styles.row}>
            <StyledButton
              type={'confirm'}
              onPress={handleContinueToAmount}
              disabled={!selectedPaymentMethodId}
            >
              {strings(
                'fiat_on_ramp_aggregator.paymentMethod.continue_to_amount',
              )}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default PaymentMethod;
