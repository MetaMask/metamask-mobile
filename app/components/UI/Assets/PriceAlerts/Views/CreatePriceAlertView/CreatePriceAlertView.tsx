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
import AlertTypeToggle from '../../components/AlertTypeToggle';
import {
  type AlertType,
  type CreatePriceAlertRouteParams,
  CreatePriceAlertTestIds,
} from '../../constants';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AbsolutePriceAlertForm from './AbsolutePriceAlertForm';
import PercentChangeAlertForm from './PercentChangeAlertForm';

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
    existingThresholds,
    existingPercentAlerts,
    editingAlert,
    initialType,
  } = route.params;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isEditing = Boolean(editingAlert);
  const displayTicker = ticker || symbol;
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
          asset_id: assetId,
          token_symbol: displayTicker,
          has_existing_alert:
            (existingThresholds?.length ?? 0) > 0 ||
            (existingPercentAlerts?.length ?? 0) > 0,
        })
        .build(),
    );
  }, [
    assetId,
    createEventBuilder,
    displayTicker,
    existingPercentAlerts,
    existingThresholds,
    isEditing,
    trackEvent,
  ]);

  const formattedCurrentPrice = useMemo(
    () => formatPriceWithSubscriptNotation(currentPrice, currentCurrency),
    [currentCurrency, currentPrice],
  );

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

        <AlertTypeToggle
          value={alertType}
          onChange={setAlertType}
          isDisabled={isEditing}
        />

        {alertType === 'percent_change' ? (
          <PercentChangeAlertForm
            assetId={assetId}
            displayTicker={displayTicker}
            fromManage={fromManage}
            editingAlert={editingPercentAlert}
            existingPercentAlerts={existingPercentAlerts}
          />
        ) : (
          <AbsolutePriceAlertForm
            assetId={assetId}
            displayTicker={displayTicker}
            currentPrice={currentPrice}
            currentCurrency={currentCurrency}
            fromManage={fromManage}
            editingAlert={editingAbsoluteAlert}
            existingThresholds={existingThresholds}
          />
        )}
      </Box>
    </SafeAreaView>
  );
};

export default CreatePriceAlertView;
