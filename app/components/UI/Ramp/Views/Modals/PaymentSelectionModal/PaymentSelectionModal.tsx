import React, { useCallback, useMemo, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import type { PaymentMethod } from '@metamask/ramps-controller';
import { useWindowDimensions, View, ScrollView } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
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
import { useRampsController } from '../../../hooks/useRampsController';
import { useRampsQuotes } from '../../../hooks/useRampsQuotes';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

export interface PaymentSelectionModalParams {
  amount?: number;
  onPaymentMethodSelect?: () => void;
}

export const createPaymentSelectionModalNavigationDetails =
  createNavigationDetails<PaymentSelectionModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
  );

const DEFAULT_QUOTE_AMOUNT = 100;

function PaymentSelectionModal() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });
  const navigation = useNavigation();
  const { amount: routeAmount, onPaymentMethodSelect } =
    useParams<PaymentSelectionModalParams>();

  const {
    selectedProvider,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    userRegion,
    selectedToken,
  } = useRampsController();

  const amount = routeAmount ?? DEFAULT_QUOTE_AMOUNT;
  const walletAddress =
    useRampAccountAddress((selectedToken?.chainId as CaipChainId) ?? null) ??
    '';
  const assetId = selectedToken?.assetId ?? '';

  const paymentMethodIds = useMemo(
    () => paymentMethods.map((pm) => pm.id),
    [paymentMethods],
  );

  const quoteFetchParams = useMemo(
    () =>
      amount > 0 &&
      walletAddress &&
      assetId &&
      !paymentMethodsLoading &&
      paymentMethodIds.length > 0
        ? {
            amount,
            walletAddress,
            assetId,
            providers: selectedProvider ? [selectedProvider.id] : undefined,
            paymentMethods: paymentMethodIds,
            forceRefresh: true,
          }
        : null,
    [
      amount,
      walletAddress,
      assetId,
      selectedProvider,
      paymentMethodIds,
      paymentMethodsLoading,
    ],
  );

  const { data: quotes, loading: quotesLoading } =
    useRampsQuotes(quoteFetchParams);

  const handleChangeProviderPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CHANGE_PROVIDER_BUTTON_CLICKED)
        .addProperties({
          current_provider: selectedProvider?.name,
          location: 'Payment Selection',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(Routes.RAMP.MODALS.PROVIDER_SELECTION, { amount });
  }, [
    navigation,
    amount,
    selectedProvider?.name,
    trackEvent,
    createEventBuilder,
  ]);

  const handlePaymentMethodPress = useCallback(
    (paymentMethod: PaymentMethod) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED)
          .addProperties({
            payment_method_id: paymentMethod.id,
            ramp_type: 'UNIFIED_BUY_2',
            region: userRegion?.regionCode ?? '',
            is_authenticated: false,
          })
          .build(),
      );
      setSelectedPaymentMethod(paymentMethod);
      sheetRef.current?.onCloseBottomSheet(() => {
        onPaymentMethodSelect?.();
      });
    },
    [
      setSelectedPaymentMethod,
      onPaymentMethodSelect,
      userRegion?.regionCode,
      trackEvent,
      createEventBuilder,
    ],
  );

  const currency = userRegion?.country?.currency ?? 'USD';
  const tokenSymbol = selectedToken?.symbol ?? '';

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: PaymentMethod }) => {
      const matchedQuote =
        quotes?.success?.find(
          (quote) => quote.quote?.paymentMethod === paymentMethod.id,
        ) ?? null;
      const hasQuoteError =
        !matchedQuote &&
        (quotes?.error?.length ?? 0) > 0 &&
        (quotes?.success?.length ?? 0) === 0;

      return (
        <PaymentMethodListItem
          paymentMethod={paymentMethod}
          onPress={() => handlePaymentMethodPress(paymentMethod)}
          isSelected={selectedPaymentMethod?.id === paymentMethod.id}
          showQuote={amount > 0}
          quote={matchedQuote}
          quoteLoading={quotesLoading}
          quoteError={hasQuoteError}
          currency={currency}
          tokenSymbol={tokenSymbol}
        />
      );
    },
    [
      handlePaymentMethodPress,
      selectedPaymentMethod,
      amount,
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
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('fiat_on_ramp.buying_via', {
                providerName: selectedProvider.name,
              })}{' '}
              <Text
                variant={TextVariant.BodySM}
                color={
                  paymentMethodsError
                    ? TextColor.Alternative
                    : TextColor.Primary
                }
                onPress={
                  paymentMethodsError ? undefined : handleChangeProviderPress
                }
              >
                {strings('fiat_on_ramp.change_provider')}
              </Text>
            </Text>
          </Box>
        ) : null}
      </View>
    </BottomSheet>
  );
}

export default PaymentSelectionModal;
