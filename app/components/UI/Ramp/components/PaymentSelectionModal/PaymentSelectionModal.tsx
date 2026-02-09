import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { useWindowDimensions, View, ScrollView } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { AnimationDuration } from '../../../../../component-library/constants/animation.constants';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PaymentSelectionModal.styles';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import PaymentMethodListItem from './PaymentMethodListItem';
import PaymentMethodListSkeleton from './PaymentMethodListSkeleton';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import ProviderSelection from './ProviderSelection';
import type {
  PaymentMethod,
  Provider,
  Quote,
} from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';

export interface PaymentSelectionModalParams {
  amount?: number;
}

export const createPaymentSelectionModalNavigationDetails =
  createNavigationDetails<PaymentSelectionModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
  );

enum ViewType {
  PAYMENT = 'PAYMENT',
  PROVIDER = 'PROVIDER',
}

const DEFAULT_QUOTE_AMOUNT = 100;

function PaymentSelectionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
    screenWidth,
  });
  const { amount: routeAmount } = useParams<PaymentSelectionModalParams>();

  const {
    selectedProvider,
    setSelectedProvider,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    getQuotes,
    userRegion,
    selectedToken,
  } = useRampsController();
  const amount = routeAmount ?? DEFAULT_QUOTE_AMOUNT;
  const walletAddress = useRampAccountAddress(
    (selectedToken?.chainId as CaipChainId) ?? null,
  );

  const [activeView, setActiveView] = useState(ViewType.PAYMENT);
  const [paymentMethodQuotes, setPaymentMethodQuotes] = useState<Record<
    string,
    Quote
  > | null>(null);
  const [paymentMethodQuotesLoading, setPaymentMethodQuotesLoading] =
    useState(false);
  const [erroredPaymentMethodIds, setErroredPaymentMethodIds] = useState<
    Set<string>
  >(new Set());

  const translateX = useSharedValue(0);

  const canFetchPaymentMethodQuotes =
    activeView === ViewType.PAYMENT &&
    selectedProvider &&
    userRegion?.regionCode &&
    userRegion?.country?.currency &&
    selectedToken?.assetId &&
    walletAddress &&
    paymentMethods.length > 0 &&
    amount > 0;

  useEffect(() => {
    if (!canFetchPaymentMethodQuotes) {
      return;
    }

    const paymentMethodIds = paymentMethods.map((pm) => pm.id);
    let cancelled = false;
    setPaymentMethodQuotesLoading(true);
    setErroredPaymentMethodIds(new Set());

    getQuotes({
      region: userRegion.regionCode,
      fiat: userRegion.country.currency,
      assetId: selectedToken.assetId,
      amount,
      walletAddress,
      paymentMethods: paymentMethodIds,
      provider: selectedProvider.id,
    })
      .then((response) => {
        if (cancelled) return;
        const byPaymentMethod: Record<string, Quote> = {};
        for (const quote of response.success) {
          const pmId = quote.quote?.paymentMethod;
          if (pmId) byPaymentMethod[pmId] = quote;
        }
        setPaymentMethodQuotes(byPaymentMethod);
        const receivedIds = new Set(Object.keys(byPaymentMethod));
        setErroredPaymentMethodIds(
          new Set(paymentMethodIds.filter((id) => !receivedIds.has(id))),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentMethodQuotes(null);
          setErroredPaymentMethodIds(new Set());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaymentMethodQuotesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    canFetchPaymentMethodQuotes,
    getQuotes,
    amount,
    paymentMethods,
    selectedProvider?.id,
    selectedToken?.assetId,
    userRegion?.regionCode,
    userRegion?.country?.currency,
    walletAddress,
  ]);

  useEffect(() => {
    const animationConfig = {
      duration: AnimationDuration.Regularly,
      easing: Easing.out(Easing.ease),
    };

    if (activeView === ViewType.PROVIDER) {
      translateX.value = withTiming(-screenWidth, animationConfig);
    } else {
      translateX.value = withTiming(0, animationConfig);
    }
  }, [activeView, screenWidth, translateX]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleChangeProviderPress = useCallback(() => {
    setActiveView(ViewType.PROVIDER);
  }, []);

  const handleProviderBack = useCallback(() => {
    setActiveView(ViewType.PAYMENT);
  }, []);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      setActiveView(ViewType.PAYMENT);
    },
    [setSelectedProvider],
  );

  const handlePaymentMethodPress = useCallback(
    (paymentMethod: PaymentMethod) => {
      setSelectedPaymentMethod(paymentMethod);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedPaymentMethod],
  );

  const currency = userRegion?.country?.currency ?? 'USD';
  const tokenSymbol = selectedToken?.symbol ?? '';

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: PaymentMethod }) => (
      <PaymentMethodListItem
        paymentMethod={paymentMethod}
        onPress={() => handlePaymentMethodPress(paymentMethod)}
        isSelected={selectedPaymentMethod?.id === paymentMethod.id}
        quote={paymentMethodQuotes?.[paymentMethod.id] ?? null}
        quoteLoading={paymentMethodQuotesLoading}
        quoteError={erroredPaymentMethodIds.has(paymentMethod.id)}
        currency={currency}
        tokenSymbol={tokenSymbol}
      />
    ),
    [
      handlePaymentMethodPress,
      selectedPaymentMethod,
      paymentMethodQuotes,
      paymentMethodQuotesLoading,
      erroredPaymentMethodIds,
      currency,
      tokenSymbol,
    ],
  );

  const renderListContent = () => {
    if (paymentMethodsLoading) {
      return (
        <ScrollView style={styles.list}>
          <PaymentMethodListSkeleton />
        </ScrollView>
      );
    }
    if (paymentMethodsError) {
      return (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.alertContainer}
        >
          <PaymentSelectionAlert
            message={
              paymentMethodsError || strings('fiat_on_ramp.payment_error')
            }
          />
        </ScrollView>
      );
    }
    if (paymentMethods.length === 0) {
      return (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.alertContainer}
        >
          <PaymentSelectionAlert
            message={strings('fiat_on_ramp.no_payment_methods_available')}
            severity={BannerAlertSeverity.Warning}
          />
        </ScrollView>
      );
    }
    return (
      <FlatList
        style={styles.list}
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    );
  };

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <View style={styles.containerOuter}>
        <Animated.View style={[styles.containerInner, animatedContainerStyle]}>
          <View style={styles.panel}>
            <View style={styles.paymentPanelContent}>
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="px-4 py-3"
              >
                <Text variant={TextVariant.HeadingMD}>
                  {strings('fiat_on_ramp.pay_with')}
                </Text>
              </Box>
              {renderListContent()}
            </View>
            {selectedProvider ? (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                style={styles.footer}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {strings('fiat_on_ramp.buying_via', {
                    providerName: selectedProvider.name,
                  })}{' '}
                  <Text
                    variant={TextVariant.BodySM}
                    color={
                      paymentMethodsLoading || paymentMethodsError
                        ? TextColor.Alternative
                        : TextColor.Primary
                    }
                    onPress={
                      paymentMethodsLoading || paymentMethodsError
                        ? undefined
                        : handleChangeProviderPress
                    }
                  >
                    {strings('fiat_on_ramp.change_provider')}
                  </Text>
                </Text>
              </Box>
            ) : null}
          </View>
          <View style={styles.panel}>
            <ProviderSelection
              onProviderSelect={handleProviderSelect}
              onBack={handleProviderBack}
              amount={routeAmount ?? DEFAULT_QUOTE_AMOUNT}
            />
          </View>
        </Animated.View>
      </View>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
