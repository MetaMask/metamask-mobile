import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import PaymentMethod from '../components/PaymentMethod';
import { useFiatOnRampSDK } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import { useTheme } from '../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import SkeletonBox from '../components/SkeletonBox';
import SkeletonText from '../components/SkeletonText';
import BaseListItem from '../../../Base/ListItem';
import Box from '../components/Box';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import Routes from '../../../../constants/navigation/Routes';
import useAnalytics from '../hooks/useAnalytics';
import usePaymentMethods from '../hooks/usePaymentMethods';
import useRegions from '../hooks/useRegions';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import { createAmountToBuyNavDetails } from './AmountToBuy';
// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;

interface PaymenthMehodsParams {
  showBack?: boolean;
}

export const createPaymentMethodsNavDetails =
  createNavigationDetails<PaymenthMehodsParams>(
    Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD,
  );

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

const PaymentMethods = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const params = useParams<PaymenthMehodsParams>();

  const {
    setSelectedRegion,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    selectedChainId,
    sdkError,
  } = useFiatOnRampSDK();

  const { selectedRegion } = useRegions();

  const {
    data: paymentMethods,
    isFetching,
    error,
    query: queryGetPaymentMethods,
    currentPaymentMethod,
  } = usePaymentMethods();

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

  const handleResetState = useCallback(() => {
    setSelectedRegion(null);
    setSelectedPaymentMethodId(null);
    const needsReset = params.showBack === false;
    if (needsReset) {
      navigation.reset({
        routes: [{ name: Routes.FIAT_ON_RAMP_AGGREGATOR.REGION }],
      });
    } else {
      navigation.goBack();
    }
  }, [
    params.showBack,
    setSelectedPaymentMethodId,
    setSelectedRegion,
    navigation,
  ]);

  const handleContinueToAmount = useCallback(() => {
    navigation.navigate(...createAmountToBuyNavDetails());
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.payment_method.payment_method',
          ),
          showBack: params.showBack,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress, params.showBack]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting
            error={sdkError}
            location={'Payment Method Screen'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={queryGetPaymentMethods}
            location={'Payment Method Screen'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (!paymentMethods || isFetching) {
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

  if (paymentMethods.length === 0) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            title={strings(
              'fiat_on_ramp_aggregator.payment_method.no_payment_methods_title',
              { regionName: selectedRegion?.name },
            )}
            description={strings(
              'fiat_on_ramp_aggregator.payment_method.no_payment_methods_description',
              { regionName: selectedRegion?.name },
            )}
            ctaOnPress={handleResetState}
            ctaLabel={strings(
              'fiat_on_ramp_aggregator.payment_method.reset_region',
            )}
            location={'Payment Method Screen'}
            icon="info"
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScrollView>
          <ScreenLayout.Content>
            {paymentMethods.map((payment) => (
              <View key={payment.id} style={styles.row}>
                <PaymentMethod
                  payment={payment}
                  highlighted={payment.id === selectedPaymentMethodId}
                  onPress={
                    payment.id === selectedPaymentMethodId
                      ? undefined
                      : () => handlePaymentMethodPress(payment.id)
                  }
                />
              </View>
            ))}
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          {currentPaymentMethod?.disclaimer ? (
            <View style={styles.row}>
              <Text small grey centered>
                {currentPaymentMethod.disclaimer}
              </Text>
            </View>
          ) : null}
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

export default PaymentMethods;
