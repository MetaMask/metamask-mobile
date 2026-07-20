import React, { useCallback, useMemo, useState } from 'react';
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
import { strings } from '../../../../../../../locales/i18n';
import { type KeypadChangeData } from '../../../../../Base/Keypad';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import AlertAmountInput from '../../components/AlertAmountInput';
import AlertFormShell from '../../components/AlertFormShell';
import {
  type AbsolutePriceAlert,
  CreatePriceAlertTestIds,
  CURRENCY_SYMBOLS,
  PRICE_ALERT_QUICK_PERCENTAGES,
  PriceAlertAnalytics,
} from '../../constants';
import { useSubmitPriceAlert } from '../../api';
import { type SaveAlert } from '../../hooks/useAlertSaveFlow';
import { getKeypadDecimalPlaces, KEYPAD_EMPTY, toKeypadString } from './utils';

interface AbsolutePriceAlertFormProps {
  assetId: string;
  displayTicker: string;
  currentPrice: number;
  currentCurrency: string;
  saveAlert: SaveAlert;
  editingAlert?: AbsolutePriceAlert;
  existingAbsoluteAlerts?: AbsolutePriceAlert[];
}

const AbsolutePriceAlertForm: React.FC<AbsolutePriceAlertFormProps> = ({
  assetId,
  displayTicker,
  currentPrice,
  currentCurrency,
  saveAlert,
  editingAlert,
  existingAbsoluteAlerts,
}) => {
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
      (existingAbsoluteAlerts ?? []).some(
        (existingAlert) =>
          existingAlert.id !== editingAlert?.id &&
          existingAlert.threshold === targetPrice,
      ),
    [editingAlert, existingAbsoluteAlerts, hasValidTarget, targetPrice],
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

  const handleSave = useCallback(async () => {
    if (!hasValidTarget) return;

    await saveAlert({
      submit: () =>
        submit({
          asset: assetId,
          threshold: targetPrice,
          recurring: isRecurring,
        }),
      editingAlert,
      patch: { threshold: targetPrice, recurring: isRecurring },
      analyticsProperties: {
        alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
        alert_value: targetPrice,
        alert_recurring: isRecurring,
      },
    });
  }, [
    assetId,
    editingAlert,
    hasValidTarget,
    isRecurring,
    saveAlert,
    submit,
    targetPrice,
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

  const quickPercentagePills = (
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
  );

  return (
    <AlertFormShell
      isRecurring={isRecurring}
      onRecurringChange={setIsRecurring}
      keypadValue={targetAmount}
      onKeypadChange={handleKeypadChange}
      keypadDecimals={getKeypadDecimalPlaces(currentPrice)}
      saveButtonLabel={saveButtonLabel}
      onSave={handleSave}
      isSubmitting={isSubmitting}
      isSaveDisabled={!hasValidTarget || isDuplicateThreshold || isUnchanged}
      footerAccessory={quickPercentagePills}
    >
      <Box alignItems={BoxAlignItems.Center}>
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
    </AlertFormShell>
  );
};

export default AbsolutePriceAlertForm;
