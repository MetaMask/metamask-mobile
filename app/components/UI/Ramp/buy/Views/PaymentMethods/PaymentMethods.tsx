import React, { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text from '../../../../../Base/Text';
import Row from '../../../common/components/Row';
import ScreenLayout from '../../../common/components/ScreenLayout';
import PaymentMethod from '../../../common/components/PaymentMethod';
import SkeletonPaymentMethod from '../../../common/components/SkeletonPaymentMethod';
import ErrorView from '../../../common/components/ErrorView';
import ErrorViewWithReporting from '../../../common/components/ErrorViewWithReporting';
import StyledButton from '../../../../StyledButton';

import { useRampSDK } from '../../../common/sdk';
import { useTheme } from '../../../../../../util/theme';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

import useAnalytics from '../../../common/hooks/useAnalytics';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import useRegions from '../../hooks/useRegions';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';

import { createAmountToBuyNavDetails } from '../AmountToBuy';

interface PaymentMethodsParams {
  showBack?: boolean;
}

export const createPaymentMethodsNavDetails =
  createNavigationDetails<PaymentMethodsParams>(Routes.RAMP.BUY.PAYMENT_METHOD);

const PaymentMethods = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const { showBack } = useParams<PaymentMethodsParams>();

  const {
    setSelectedRegion,
    setSelectedPaymentMethodId,
    selectedChainId,
    sdkError,
  } = useRampSDK();

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
        available_payment_method_ids: paymentMethods?.map(
          (paymentMethod) => paymentMethod.id,
        ) as string[],
        region: selectedRegion?.id as string,
        location: 'Payment Method Screen',
      });
    },
    [
      paymentMethods,
      selectedRegion?.id,
      setSelectedPaymentMethodId,
      trackEvent,
    ],
  );

  const handleResetState = useCallback(() => {
    setSelectedRegion(null);
    setSelectedPaymentMethodId(null);
    const needsReset = showBack === false;
    if (needsReset) {
      navigation.reset({
        routes: [{ name: Routes.RAMP.BUY.REGION }],
      });
    } else {
      navigation.goBack();
    }
  }, [showBack, setSelectedPaymentMethodId, setSelectedRegion, navigation]);

  const handleContinueToAmount = useCallback(() => {
    trackEvent('ONRAMP_CONTINUE_TO_AMOUNT_CLICKED', {
      available_payment_method_ids: paymentMethods?.map(
        (paymentMethod) => paymentMethod.id,
      ) as string[],
      payment_method_id: currentPaymentMethod?.id as string,
      region: selectedRegion?.id as string,
      location: 'Payment Method Screen',
    });
    navigation.navigate(...createAmountToBuyNavDetails());
  }, [
    currentPaymentMethod?.id,
    navigation,
    paymentMethods,
    selectedRegion?.id,
    trackEvent,
  ]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.payment_method.payment_method',
          ),
          showBack,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress, showBack]);

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
            <Row first>
              <SkeletonPaymentMethod />
            </Row>
            <Row>
              <SkeletonPaymentMethod />
            </Row>
            <Row last>
              <SkeletonPaymentMethod />
            </Row>
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
            {paymentMethods.map((payment, index) => (
              <Row
                key={payment.id}
                first={index === 0}
                last={index === paymentMethods.length - 1}
              >
                <PaymentMethod
                  payment={payment}
                  highlighted={payment.id === currentPaymentMethod?.id}
                  onPress={
                    payment.id === currentPaymentMethod?.id
                      ? undefined
                      : () => handlePaymentMethodPress(payment.id)
                  }
                />
              </Row>
            ))}
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          {currentPaymentMethod?.disclaimer ? (
            <Row>
              <Text small grey centered>
                {currentPaymentMethod.disclaimer}
              </Text>
            </Row>
          ) : null}
          <Row>
            <StyledButton
              type={'confirm'}
              onPress={handleContinueToAmount}
              disabled={!currentPaymentMethod}
            >
              {strings(
                'fiat_on_ramp_aggregator.payment_method.continue_to_amount',
              )}
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default PaymentMethods;
