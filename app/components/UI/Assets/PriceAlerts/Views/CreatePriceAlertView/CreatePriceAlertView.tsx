import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../../../core/NavigationService/types';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import { formatPerpsPrice } from '../../../../Perps/utils/formatUtils';
import { PerpsStreamProvider } from '../../../../Perps/providers/PerpsStreamManager';
import { usePerpsLiveFocusedPrice } from '../../../../Perps/hooks/stream/usePerpsLiveFocusedPrice';
import AlertTypeToggle from '../../components/AlertTypeToggle';
import {
  type AlertType,
  type CreatePriceAlertRouteParams,
  CreatePriceAlertTestIds,
  PriceAlertAnalytics,
} from '../../constants';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import useAlertSaveFlow from '../../hooks/useAlertSaveFlow';
import usePerpAlertSaveFlow from '../../perpApi';
import AbsolutePriceAlertForm from './AbsolutePriceAlertForm';
import PercentChangeAlertForm from './PercentChangeAlertForm';
import { FeatureNotificationsGate } from '../../../../../../components/Views/Settings/NotificationsSettings/FeatureNotificationsGate';

/**
 * Mounted only in perps mode (inside PerpsStreamProvider). Spot Create lives
 * on the main stack without that provider, so the focused-price hook cannot
 * run there.
 */
const PerpsAlertLivePrice: React.FC<{
  symbol: string;
  onPrice: (price: number) => void;
}> = ({ symbol, onPrice }) => {
  const focused = usePerpsLiveFocusedPrice({ symbol, enabled: true });
  const raw = focused?.markPrice ?? focused?.price;
  const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw);

  useEffect(() => {
    if (Number.isFinite(parsed)) {
      onPrice(parsed);
    }
  }, [parsed, onPrice]);

  return null;
};

const CreatePriceAlertView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        { CreatePriceAlert: CreatePriceAlertRouteParams },
        'CreatePriceAlert'
      >
    >();
  const {
    symbol,
    ticker,
    currentPrice,
    currentCurrency,
    assetId,
    fromManage,
    existingAbsoluteAlerts,
    existingPercentAlerts,
    editingAlert,
    initialType,
    mode,
    marketId,
    szDecimals,
  } = route.params;
  const isPerpsMode = mode === 'perps';
  const [livePrice, setLivePrice] = useState<number | undefined>();
  const displayPrice =
    isPerpsMode && livePrice !== undefined ? livePrice : currentPrice;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isEditing = Boolean(editingAlert);
  const displayTicker = ticker || symbol;
  const shouldAutoWatchlistOnCreate =
    !isEditing &&
    (existingAbsoluteAlerts?.length ?? 0) === 0 &&
    (existingPercentAlerts?.length ?? 0) === 0;

  // Spot flow — always call both hooks to satisfy Rules of Hooks.
  const { saveAlert: spotSaveAlert } = useAlertSaveFlow({
    assetId,
    displayTicker,
    fromManage,
    shouldAutoWatchlistOnCreate,
  });
  const { saveAlert: perpSaveAlert } = usePerpAlertSaveFlow({
    marketId: marketId ?? '',
    displayTicker,
    fromManage,
  });
  const saveAlert = isPerpsMode ? perpSaveAlert : spotSaveAlert;
  const [alertType, setAlertType] = useState<AlertType>(
    editingAlert?.type ?? initialType ?? 'absolute_price',
  );
  const hasTrackedCreationView = useRef(false);

  useEffect(() => {
    if (isEditing || hasTrackedCreationView.current) return;
    hasTrackedCreationView.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED)
        .addProperties({
          asset_id: isPerpsMode ? marketId : assetId,
          token_symbol: displayTicker,
          alert_market_type: isPerpsMode
            ? PriceAlertAnalytics.MARKET_TYPE.PERPS
            : PriceAlertAnalytics.MARKET_TYPE.SPOT,
          has_existing_alert:
            (existingAbsoluteAlerts?.length ?? 0) > 0 ||
            (existingPercentAlerts?.length ?? 0) > 0,
        })
        .build(),
    );
  }, [
    assetId,
    marketId,
    isPerpsMode,
    createEventBuilder,
    displayTicker,
    existingAbsoluteAlerts,
    existingPercentAlerts,
    isEditing,
    trackEvent,
  ]);

  const formattedCurrentPrice = useMemo(() => {
    if (isPerpsMode) {
      // Deliberately omits szDecimals so this reads identically to the live
      // market header, which formats by magnitude rather than venue tick size.
      return formatPerpsPrice(displayPrice);
    }
    return formatPriceWithSubscriptNotation(displayPrice, currentCurrency);
  }, [currentCurrency, displayPrice, isPerpsMode]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Narrow the alert union so each form receives only its supported alert type.
  const editingAbsoluteAlert =
    editingAlert?.type === 'absolute_price' ? editingAlert : undefined;
  const editingPercentAlert =
    editingAlert?.type === 'percent_change' ? editingAlert : undefined;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={CreatePriceAlertTestIds.CONTAINER}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title={strings(
            isEditing ? 'price_alerts.edit_title' : 'price_alerts.create_title',
            { ticker: displayTicker },
          )}
          subtitle={formattedCurrentPrice}
          onBack={handleBack}
        />

        {isPerpsMode ? (
          <PerpsStreamProvider>
            <PerpsAlertLivePrice symbol={assetId} onPrice={setLivePrice} />
          </PerpsStreamProvider>
        ) : null}

        {/* Percent-change tab is not supported by the perp alerts API */}
        {!isPerpsMode && (
          <AlertTypeToggle
            value={alertType}
            onChange={setAlertType}
            isDisabled={isEditing}
          />
        )}

        {!isPerpsMode && alertType === 'percent_change' ? (
          <PercentChangeAlertForm
            assetId={assetId}
            saveAlert={saveAlert}
            editingAlert={editingPercentAlert}
            existingPercentAlerts={existingPercentAlerts}
          />
        ) : (
          <AbsolutePriceAlertForm
            assetId={assetId}
            displayTicker={displayTicker}
            currentPrice={displayPrice}
            currentCurrency={currentCurrency}
            saveAlert={saveAlert}
            editingAlert={editingAbsoluteAlert}
            existingAbsoluteAlerts={existingAbsoluteAlerts}
            marketId={isPerpsMode ? marketId : undefined}
            szDecimals={szDecimals}
          />
        )}

        <FeatureNotificationsGate feature="priceAlerts" />
      </Box>
    </SafeAreaView>
  );
};

export default CreatePriceAlertView;
