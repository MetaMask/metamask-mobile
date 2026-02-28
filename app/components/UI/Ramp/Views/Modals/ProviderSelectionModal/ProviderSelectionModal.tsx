import React, { useCallback, useMemo, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { CaipChainId } from '@metamask/utils';
import type { Provider } from '@metamask/ramps-controller';
import { useSelector } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import ProviderSelection from './ProviderSelection';
import { useRampsController } from '../../../hooks/useRampsController';
import { useRampsQuotes } from '../../../hooks/useRampsQuotes';
import useRampAccountAddress from '../../../hooks/useRampAccountAddress';
import { getOrdersProviders } from '../../../../../../reducers/fiatOrders';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ProviderSelectionModal.styles';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

export interface ProviderSelectionModalParams {
  amount?: number;
  assetId?: string;
  skipQuotes?: boolean;
}

export const createProviderSelectionModalNavigationDetails =
  createNavigationDetails<ProviderSelectionModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PROVIDER_SELECTION,
  );

const DEFAULT_QUOTE_AMOUNT = 100;

function ProviderSelectionModal() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, { screenHeight });
  const navigation = useNavigation();
  const {
    amount: routeAmount,
    assetId: paramAssetId,
    skipQuotes = false,
  } = useParams<ProviderSelectionModalParams>();

  const {
    providers,
    selectedProvider,
    setSelectedProvider,
    selectedPaymentMethod,
    selectedToken,
  } = useRampsController();

  const ordersProviders = useSelector(getOrdersProviders);

  const hasPaymentModalInStack = useNavigationState((state) =>
    state.routes.some(
      (route) => route.name === Routes.RAMP.MODALS.PAYMENT_SELECTION,
    ),
  );

  const amount = routeAmount ?? DEFAULT_QUOTE_AMOUNT;
  const walletAddress =
    useRampAccountAddress((selectedToken?.chainId as CaipChainId) ?? null) ??
    '';
  const assetId = paramAssetId ?? selectedToken?.assetId ?? '';

  const displayProviders = useMemo(() => {
    if (!paramAssetId) return providers;
    return providers.filter(
      (p) => p.supportedCryptoCurrencies?.[paramAssetId] === true,
    );
  }, [providers, paramAssetId]);

  const providerIds = useMemo(
    () => displayProviders.map((p) => p.id),
    [displayProviders],
  );

  const quoteFetchParams = useMemo(
    () =>
      !skipQuotes && walletAddress && assetId
        ? {
            amount,
            walletAddress,
            assetId,
            providers: providerIds,
            paymentMethods: selectedPaymentMethod
              ? [selectedPaymentMethod.id]
              : undefined,
            forceRefresh: true,
          }
        : null,
    [
      skipQuotes,
      amount,
      walletAddress,
      assetId,
      providerIds,
      selectedPaymentMethod,
    ],
  );

  const {
    data: quotes,
    loading: quotesLoading,
    error: quotesError,
  } = useRampsQuotes(quoteFetchParams);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProviderSelect = useCallback(
    (provider: Provider) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_PROVIDER_SELECTED)
          .addProperties({
            provider: provider.name,
            previous_provider: selectedProvider?.name,
            location: 'Amount Input',
            ramp_type: 'UNIFIED_BUY_2',
          })
          .build(),
      );
      setSelectedProvider(provider);
      navigation.goBack();
    },
    [
      setSelectedProvider,
      navigation,
      selectedProvider?.name,
      trackEvent,
      createEventBuilder,
    ],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <View style={styles.container}>
        <ProviderSelection
          providers={displayProviders}
          quotes={quotes}
          quotesLoading={quotesLoading}
          quotesError={quotesError}
          showQuotes={!skipQuotes}
          showBackButton={hasPaymentModalInStack}
          ordersProviders={ordersProviders}
          onBack={handleBack}
          onProviderSelect={handleProviderSelect}
        />
      </View>
    </BottomSheet>
  );
}

export default ProviderSelectionModal;
