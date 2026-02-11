import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { AnimationDuration } from '../../../../../../component-library/constants/animation.constants';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './PaymentSelectionModal.styles';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import PaymentMethodListItem from './PaymentMethodListItem';
import PaymentMethodListSkeleton from './PaymentMethodListSkeleton';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import ProviderSelection from './ProviderSelection';
import type { PaymentMethod, Provider } from '@metamask/ramps-controller';
import { useRampsController } from '../../../hooks/useRampsController';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';

export interface PaymentSelectionModalParams {
  amount?: number;
  onPaymentMethodSelect?: () => void;
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
  const { amount: routeAmount, onPaymentMethodSelect } =
    useParams<PaymentSelectionModalParams>();

  const {
    selectedProvider,
    setSelectedProvider,
    providers,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    quotes,
    quotesLoading,
    getQuotes,
    userRegion,
    selectedToken,
  } = useRampsController();

  const amount = routeAmount ?? DEFAULT_QUOTE_AMOUNT;
  const walletAddress =
    useRampAccountAddress((selectedToken?.chainId as CaipChainId) ?? null) ??
    '';
  const assetId = selectedToken?.assetId ?? '';

  const [activeView, setActiveView] = useState(ViewType.PAYMENT);

  const paymentMethodIds = useMemo(
    () => paymentMethods.map((pm) => pm.id),
    [paymentMethods],
  );
  const providerIds = useMemo(() => providers.map((p) => p.id), [providers]);

  const translateX = useSharedValue(0);

  useEffect(() => {
    getQuotes({
      amount,
      walletAddress,
      assetId,
      providers: [selectedProvider?.id ?? ''],
      paymentMethods: paymentMethodIds,
    });
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getQuotes, amount, walletAddress, assetId, paymentMethodIds]);

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
    if (quotesLoading) {
      return;
    }
    getQuotes({
      amount,
      walletAddress,
      assetId,
      providers: providerIds,
      paymentMethods: [selectedPaymentMethod?.id ?? ''],
    });
    setActiveView(ViewType.PROVIDER);
  }, [
    amount,
    assetId,
    getQuotes,
    providerIds,
    quotesLoading,
    selectedPaymentMethod?.id,
    walletAddress,
  ]);

  const handleProviderBack = useCallback(() => {
    getQuotes({
      amount,
      walletAddress,
      assetId,
      providers: [selectedProvider?.id ?? ''],
      paymentMethods: paymentMethodIds,
    });
    setActiveView(ViewType.PAYMENT);
  }, [
    amount,
    assetId,
    getQuotes,
    paymentMethodIds,
    selectedProvider?.id,
    walletAddress,
  ]);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      getQuotes({
        amount,
        walletAddress,
        assetId,
        providers: [provider.id],
        paymentMethods: paymentMethodIds,
      });
      setActiveView(ViewType.PAYMENT);
    },
    [
      amount,
      assetId,
      getQuotes,
      paymentMethodIds,
      setSelectedProvider,
      walletAddress,
    ],
  );

  const handlePaymentMethodPress = useCallback(
    (paymentMethod: PaymentMethod) => {
      setSelectedPaymentMethod(paymentMethod);
      sheetRef.current?.onCloseBottomSheet(() => {
        onPaymentMethodSelect?.();
      });
    },
    [setSelectedPaymentMethod, onPaymentMethodSelect],
  );

  const currency = userRegion?.country?.currency ?? 'USD';
  const tokenSymbol = selectedToken?.symbol ?? '';

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: PaymentMethod }) => (
      <PaymentMethodListItem
        paymentMethod={paymentMethod}
        onPress={() => handlePaymentMethodPress(paymentMethod)}
        isSelected={selectedPaymentMethod?.id === paymentMethod.id}
        quote={
          quotes?.success?.find(
            (quote) => quote.quote?.paymentMethod === paymentMethod.id,
          ) ?? null
        }
        quoteLoading={quotesLoading}
        quoteError={false}
        currency={currency}
        tokenSymbol={tokenSymbol}
      />
    ),
    [
      handlePaymentMethodPress,
      selectedPaymentMethod,
      quotes,
      quotesLoading,
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
            {activeView === ViewType.PROVIDER && (
              <ProviderSelection
                onProviderSelect={handleProviderSelect}
                onBack={handleProviderBack}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
