import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { type KeypadChangeData } from '../../../../../Base/Keypad';
import AlertAmountInput from '../../components/AlertAmountInput';
import AlertFormShell from '../../components/AlertFormShell';
import AlertPeriodToggle from '../../components/AlertPeriodToggle';
import {
  type AlertDirection,
  type AlertPeriod,
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
  PriceAlertAnalytics,
} from '../../constants';
import { useSubmitPercentAlert } from '../../api';
import { useSubmitPerpPercentAlert } from '../../perpApi';
import { type SaveAlert } from '../../hooks/useAlertSaveFlow';
import {
  formatKeypadDisplay,
  KEYPAD_EMPTY,
  MAX_DOWN_PERCENT_THRESHOLD,
  PERCENT_KEYPAD_DECIMALS,
  toPercentKeypadString,
} from './utils';

const percentAmountContainerStyle = { transform: [{ translateX: 12 }] };

interface PercentChangeAlertFormProps {
  assetId: string;
  marketId?: string;
  saveAlert: SaveAlert;
  editingAlert?: PercentChangeAlert;
  existingPercentAlerts?: PercentChangeAlert[];
}

const PercentChangeAlertForm: React.FC<PercentChangeAlertFormProps> = ({
  assetId,
  marketId,
  saveAlert,
  editingAlert,
  existingPercentAlerts,
}) => {
  const isEditing = Boolean(editingAlert);
  const [percentAmount, setPercentAmount] = useState(
    editingAlert ? toPercentKeypadString(editingAlert.threshold) : KEYPAD_EMPTY,
  );
  const [isRecurring, setIsRecurring] = useState(
    editingAlert?.recurring ?? true,
  );
  const [period, setPeriod] = useState<AlertPeriod>(
    editingAlert?.period ?? '24h',
  );
  const [direction, setDirection] = useState<AlertDirection>(
    editingAlert?.direction ?? 'up',
  );

  const hasInput = percentAmount !== KEYPAD_EMPTY;
  const displayPercent = formatKeypadDisplay(percentAmount);
  const percentValue = useMemo(() => {
    const parsed = Number.parseFloat(percentAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [percentAmount]);
  const exceedsMaxDownPercent =
    direction === 'down' && percentValue > MAX_DOWN_PERCENT_THRESHOLD;
  const hasValidPercent = percentValue > 0 && !exceedsMaxDownPercent;

  const isDuplicatePercentTuple = useMemo(
    () =>
      hasValidPercent &&
      (existingPercentAlerts ?? []).some(
        (existingAlert) =>
          existingAlert.id !== editingAlert?.id &&
          existingAlert.period === period &&
          existingAlert.direction === direction &&
          existingAlert.threshold === percentValue,
      ),
    [
      direction,
      editingAlert,
      existingPercentAlerts,
      hasValidPercent,
      percentValue,
      period,
    ],
  );

  const isUnchanged =
    isEditing &&
    percentValue === editingAlert?.threshold &&
    period === editingAlert?.period &&
    direction === editingAlert?.direction &&
    isRecurring === editingAlert?.recurring;

  const { submit: submitSpotPercent, isSubmitting: isSpotSubmitting } =
    useSubmitPercentAlert(editingAlert);
  const { submit: submitPerpPercent, isSubmitting: isPerpSubmitting } =
    useSubmitPerpPercentAlert(editingAlert);
  const isPerpsMode = Boolean(marketId);
  const isSubmitting = isPerpsMode ? isPerpSubmitting : isSpotSubmitting;

  const handleSave = useCallback(async () => {
    if (!hasValidPercent) return;

    await saveAlert({
      submit: () =>
        isPerpsMode
          ? submitPerpPercent({
              marketId: marketId ?? '',
              threshold: percentValue,
              period,
              direction,
              recurring: isRecurring,
            })
          : submitSpotPercent({
              asset: assetId,
              threshold: percentValue,
              period,
              direction,
              recurring: isRecurring,
            }),
      editingAlert,
      patch: {
        threshold: percentValue,
        period,
        direction,
        recurring: isRecurring,
      },
      analyticsProperties: {
        alert_type: PriceAlertAnalytics.TYPE.PERCENT,
        alert_period: period,
        alert_direction: direction,
        alert_value: percentValue,
        alert_recurring: isRecurring,
        alert_market_type: isPerpsMode
          ? PriceAlertAnalytics.MARKET_TYPE.PERPS
          : PriceAlertAnalytics.MARKET_TYPE.SPOT,
      },
    });
  }, [
    assetId,
    direction,
    editingAlert,
    hasValidPercent,
    isRecurring,
    isPerpsMode,
    marketId,
    percentValue,
    period,
    saveAlert,
    submitPerpPercent,
    submitSpotPercent,
  ]);

  const handleKeypadChange = useCallback(({ value }: KeypadChangeData) => {
    setPercentAmount(value);
  }, []);

  const handleToggleDirection = useCallback(() => {
    setDirection((previous) => (previous === 'up' ? 'down' : 'up'));
  }, []);

  let saveButtonLabel: string;
  if (exceedsMaxDownPercent) {
    saveButtonLabel = strings('price_alerts.percent_max_down');
  } else if (isDuplicatePercentTuple) {
    saveButtonLabel = strings('price_alerts.percent_duplicate');
  } else {
    saveButtonLabel = strings(
      isEditing
        ? 'price_alerts.update_price_alert'
        : 'price_alerts.set_price_alert',
    );
  }

  const directionWord = strings(
    direction === 'up'
      ? 'price_alerts.direction_increases'
      : 'price_alerts.direction_decreases',
  );
  const directionColor =
    direction === 'up' ? TextColor.SuccessDefault : TextColor.ErrorDefault;

  const percentSuffix = (
    <Text
      variant={TextVariant.HeadingLg}
      fontWeight={FontWeight.Bold}
      color={hasInput ? TextColor.TextDefault : TextColor.TextAlternative}
      twClassName="ml-[3px]"
    >
      %
    </Text>
  );

  const alertPeriodRow = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="mb-3"
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('price_alerts.alert_period')}
      </Text>
      <AlertPeriodToggle
        value={period}
        onChange={setPeriod}
        includeFiveMinutes={isPerpsMode}
      />
    </Box>
  );

  return (
    <AlertFormShell
      isRecurring={isRecurring}
      onRecurringChange={setIsRecurring}
      aboveRecurring={alertPeriodRow}
      keypadValue={percentAmount}
      onKeypadChange={handleKeypadChange}
      keypadDecimals={PERCENT_KEYPAD_DECIMALS}
      saveButtonLabel={saveButtonLabel}
      onSave={handleSave}
      isSubmitting={isSubmitting}
      isSaveDisabled={
        !hasValidPercent || isDuplicatePercentTuple || isUnchanged
      }
    >
      <Box alignItems={BoxAlignItems.Center}>
        <AlertAmountInput
          text={displayPercent}
          hasInput={hasInput}
          suffix={percentSuffix}
          containerStyle={percentAmountContainerStyle}
          testID={CreatePriceAlertTestIds.PERCENT_INPUT}
        />

        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={handleToggleDirection}
          testID={CreatePriceAlertTestIds.DIRECTION_TOGGLE}
          accessibilityLabel={directionWord}
          twClassName="mt-3 self-center"
          endIconName={
            direction === 'up' ? IconName.TrendUp : IconName.TrendDown
          }
          endIconProps={{
            color: directionColor,
            twClassName: directionColor,
          }}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={directionColor}
          >
            {directionWord}
          </Text>
        </Button>
      </Box>
    </AlertFormShell>
  );
};

export default PercentChangeAlertForm;
