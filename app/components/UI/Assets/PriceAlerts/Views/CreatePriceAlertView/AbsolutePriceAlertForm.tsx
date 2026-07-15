import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import KeypadComponent, {
  type KeypadChangeData,
} from '../../../../../Base/Keypad';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import AlertAmountInput from '../../components/AlertAmountInput';
import RecurringToggle from '../../components/RecurringToggle';
import {
  type AbsolutePriceAlert,
  CreatePriceAlertTestIds,
  CURRENCY_SYMBOLS,
  PRICE_ALERT_QUICK_PERCENTAGES,
  PriceAlertAnalytics,
} from '../../constants';
import { useSubmitPriceAlert } from '../../api';
import useAlertSaveFlow from '../../hooks/useAlertSaveFlow';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getKeypadDecimalPlaces, KEYPAD_EMPTY, toKeypadString } from './utils';

interface AbsolutePriceAlertFormProps {
  assetId: string;
  displayTicker: string;
  currentPrice: number;
  currentCurrency: string;
  fromManage?: boolean;
  editingAlert?: AbsolutePriceAlert;
  existingThresholds?: number[];
}

const AbsolutePriceAlertForm: React.FC<AbsolutePriceAlertFormProps> = ({
  assetId,
  displayTicker,
  currentPrice,
  currentCurrency,
  fromManage,
  editingAlert,
  existingThresholds,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isEditing = Boolean(editingAlert);
  const [targetAmount, setTargetAmount] = useState(
    editingAlert ? toKeypadString(editingAlert.threshold) : KEYPAD_EMPTY,
  );
  const [isRecurring, setIsRecurring] = useState(
    editingAlert?.recurring ?? true,
  );

  const hasInput = targetAmount !== KEYPAD_EMPTY;
  const targetPrice = useMemo(() => {
    const parsed = Number.parseFloat(targetAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [targetAmount]);
  const hasValidTarget = targetPrice > 0;

  const isDuplicateThreshold = useMemo(
    () =>
      hasValidTarget &&
      (existingThresholds ?? []).some(
        (threshold) =>
          threshold === targetPrice && threshold !== editingAlert?.threshold,
      ),
    [editingAlert, existingThresholds, hasValidTarget, targetPrice],
  );

  const isUnchanged =
    isEditing &&
    targetPrice === editingAlert?.threshold &&
    isRecurring === editingAlert?.recurring;

  const percentDiff = useMemo(() => {
    if (!hasInput || currentPrice <= 0 || targetPrice <= 0) {
      return { rounded: 0, direction: 'none' as const };
    }
    const percent = ((targetPrice - currentPrice) / currentPrice) * 100;
    const rounded = Math.round(percent);
    if (rounded > 0) return { rounded, direction: 'above' as const };
    if (rounded < 0) {
      return { rounded: Math.abs(rounded), direction: 'below' as const };
    }
    return { rounded: 0, direction: 'none' as const };
  }, [currentPrice, hasInput, targetPrice]);

  const displayText = useMemo(() => {
    if (!hasInput) {
      return formatPriceWithSubscriptNotation(currentPrice, currentCurrency);
    }
    const currencySymbol =
      CURRENCY_SYMBOLS[currentCurrency.toLowerCase()] ?? '';
    return `${currencySymbol}${targetAmount}`;
  }, [currentCurrency, currentPrice, hasInput, targetAmount]);

  const { submit, isSubmitting } = useSubmitPriceAlert(editingAlert);
  const {
    showSuccessToast,
    showErrorToast,
    navigateAfterSave,
    patchAlertCache,
  } = useAlertSaveFlow({
    assetId,
    displayTicker,
    isEditing,
    fromManage,
  });

  const handleSave = useCallback(async () => {
    if (!hasValidTarget) return;

    try {
      await submit({
        asset: assetId,
        threshold: targetPrice,
        recurring: isRecurring,
      });
      if (editingAlert) {
        patchAlertCache(editingAlert.id, {
          threshold: targetPrice,
          recurring: isRecurring,
        });
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
              alert_value: targetPrice,
              alert_recurring: isRecurring,
              alert_active: editingAlert.active,
              prev_alert_value: editingAlert.threshold,
              prev_alert_recurring: editingAlert.recurring,
              prev_alert_active: editingAlert.active,
            })
            .build(),
        );
      } else {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.CREATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
              alert_value: targetPrice,
              alert_recurring: isRecurring,
              alert_active: true,
            })
            .build(),
        );
      }
      showSuccessToast();
      navigateAfterSave();
    } catch {
      showErrorToast();
    }
  }, [
    assetId,
    createEventBuilder,
    displayTicker,
    editingAlert,
    hasValidTarget,
    isRecurring,
    navigateAfterSave,
    patchAlertCache,
    showErrorToast,
    showSuccessToast,
    submit,
    targetPrice,
    trackEvent,
  ]);

  const handleKeypadChange = useCallback(({ value }: KeypadChangeData) => {
    setTargetAmount(value);
  }, []);

  const handleQuickPercentagePress = useCallback(
    (percentage: number) => {
      if (currentPrice <= 0) return;
      setTargetAmount(toKeypadString(currentPrice * (1 + percentage / 100)));
    },
    [currentPrice],
  );

  const saveButtonLabel = isDuplicateThreshold
    ? strings('price_alerts.duplicate_threshold')
    : strings(
        isEditing
          ? 'price_alerts.update_price_alert'
          : 'price_alerts.set_price_alert',
      );

  return (
    <Box twClassName="flex-1">
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 justify-center px-4 pb-4"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {strings('price_alerts.enter_target_price')}
        </Text>

        <AlertAmountInput
          text={displayText}
          hasInput={hasInput}
          testID={CreatePriceAlertTestIds.TARGET_PRICE_INPUT}
        />

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={CreatePriceAlertTestIds.PERCENT_DIFF}
          twClassName="mt-2"
        >
          {percentDiff.direction === 'none' ? (
            strings('price_alerts.approx_percent', { percent: '0' })
          ) : (
            <>
              {'≈ '}
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  percentDiff.direction === 'above'
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
              >
                {`${percentDiff.direction === 'above' ? '+' : '-'}${percentDiff.rounded}%`}
              </Text>
              {` ${strings(
                percentDiff.direction === 'above'
                  ? 'price_alerts.approx_percent_above'
                  : 'price_alerts.approx_percent_below',
                { ticker: displayTicker },
              )}`}
            </>
          )}
        </Text>
      </Box>

      <View style={tw.style('px-4 pb-2')}>
        <RecurringToggle value={isRecurring} onValueChange={setIsRecurring} />
        <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-3 gap-2">
          {PRICE_ALERT_QUICK_PERCENTAGES.map((percentage) => (
            <Button
              key={percentage}
              variant={ButtonVariant.Secondary}
              onPress={() => handleQuickPercentagePress(percentage)}
              testID={`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-${percentage}`}
              twClassName="flex-1"
            >
              {strings('price_alerts.quick_percentage', {
                percentage: percentage > 0 ? `+${percentage}` : percentage,
              })}
            </Button>
          ))}
        </Box>

        {/* "price_alert" is intentionally not in the Keypad CURRENCIES map —
            unknown codes fall through to the decimals-aware branch in useCurrency,
            which is the only path that actually enforces the decimals cap. */}
        <KeypadComponent
          value={targetAmount}
          onChange={handleKeypadChange}
          currency="price_alert"
          decimals={getKeypadDecimalPlaces(currentPrice)}
        />

        <Button
          variant={ButtonVariant.Primary}
          onPress={handleSave}
          isLoading={isSubmitting}
          isDisabled={
            isSubmitting ||
            !hasValidTarget ||
            isDuplicateThreshold ||
            isUnchanged
          }
          testID={CreatePriceAlertTestIds.SET_ALERT_BUTTON}
          twClassName="mt-3 w-full"
        >
          {saveButtonLabel}
        </Button>
      </View>
    </Box>
  );
};

export default AbsolutePriceAlertForm;
