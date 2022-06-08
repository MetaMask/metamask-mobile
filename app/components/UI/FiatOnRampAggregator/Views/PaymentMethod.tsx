import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BaseText from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentOption from '../components/PaymentOption';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { getPaymentMethodIcon } from '../utils';
import Device from '../../../../util/device';
import SkeletonBox from '../components/SkeletonBox';
import SkeletonText from '../components/SkeletonText';
import BaseListItem from '../../../Base/ListItem';
import Box from '../components/Box';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import Routes from '../../../../constants/navigation/Routes';
import useAnalytics from '../hooks/useAnalytics';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
  row: {
    marginVertical: 8,
  },
  boxMargin: {
    marginVertical: 10,
  },
});

const SkeletonPaymentOption = () => (
  <Box style={styles.boxMargin}>
    <ListItem>
      <ListItem.Content>
        <ListItem.Icon>
          <SkeletonBox />
        </ListItem.Icon>
        <ListItem.Body>
          <ListItem.Title>
            <SkeletonText thin title />
          </ListItem.Title>
        </ListItem.Body>
      </ListItem.Content>
    </ListItem>
  </Box>
);

const PaymentMethod = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();

  const {
    selectedRegion,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    selectedChainId,
    sdkError,
  } = useFiatOnRampSDK();

  const [{ data: paymentMethods, isFetching, error }, queryGetPaymentMethods] =
    useSDKMethod('getPaymentMethods', selectedRegion?.id);

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

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Payment Method Screen',
      chain_id_destination: selectedChainId,
    });
  }, [selectedChainId, trackEvent]);

  const handlePaymentMethodPress = useCallback(
    (id) => {
      setSelectedPaymentMethodId(id);
      trackEvent('ONRAMP_PAYMENT_METHOD_SELECTED', {
        payment_method_id: id,
        location: 'Payment Method Screen',
      });
    },
    [setSelectedPaymentMethodId, trackEvent],
  );

  const handleContinueToAmount = useCallback(() => {
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.AMOUNT_TO_BUY);
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.payment_method.payment_method',
          ),
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView description={error} ctaOnPress={queryGetPaymentMethods} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (isFetching) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <SkeletonPaymentOption />
            <SkeletonPaymentOption />
            <SkeletonPaymentOption />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
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
                id={id}
                onPress={
                  id === selectedPaymentMethodId
                    ? undefined
                    : () => handlePaymentMethodPress(id)
                }
                amountTier={amountTier}
                paymentType={getPaymentMethodIcon(id)}
              />
            </View>
          ))}
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View style={styles.row}>
            <Text small grey centered>
              {selectedPaymentMethodId === '/payments/apple-pay' &&
                strings(
                  'fiat_on_ramp_aggregator.payment_method.apple_cash_not_supported',
                )}
              {selectedPaymentMethodId === '/payments/debit-credit-card' &&
                strings('fiat_on_ramp_aggregator.payment_method.card_fees')}
            </Text>
          </View>
          <View style={styles.row}>
            <StyledButton
              type={'confirm'}
              onPress={handleContinueToAmount}
              disabled={!selectedPaymentMethodId}
            >
              {strings(
                'fiat_on_ramp_aggregator.payment_method.continue_to_amount',
              )}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default PaymentMethod;
