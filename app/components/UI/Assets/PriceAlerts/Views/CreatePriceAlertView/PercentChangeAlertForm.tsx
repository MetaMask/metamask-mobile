import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import { type SaveAlert } from '../../hooks/useAlertSaveFlow';
import {
  KEYPAD_EMPTY,
  MAX_DOWN_PERCENT_THRESHOLD,
  PERCENT_KEYPAD_DECIMALS,
  toPercentKeypadString,
} from './utils';

interface PercentChangeAlertFormProps {
  assetId: string;
  saveAlert: SaveAlert;
  editingAlert?: PercentChangeAlert;
  existingPercentAlerts?: PercentChangeAlert[];
}

const PercentChangeAlertForm: React.FC<PercentChangeAlertFormProps> = ({
  assetId,
  saveAlert,
  editingAlert,
  existingPercentAlerts,
}) => {
  const tw = useTailwind();
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

  const { submit, isSubmitting } = useSubmitPercentAlert(editingAlert);

  const handleSave = useCallback(async () => {
    if (!hasValidPercent) return;

    await saveAlert({
      submit: () =>
        submit({
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
      },
    });
  }, [
    assetId,
    direction,
    editingAlert,
    hasValidPercent,
    isRecurring,
    percentValue,
    period,
    saveAlert,
    submit,
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

  const directionToggle = (
    <TouchableOpacity
      onPress={handleToggleDirection}
      testID={CreatePriceAlertTestIds.DIRECTION_TOGGLE}
      style={tw.style(
        'mr-2 h-10 w-10 rounded-full bg-muted items-center justify-center',
      )}
    >
      <Icon
        name={direction === 'up' ? IconName.TrendUp : IconName.TrendDown}
        size={IconSize.Md}
        color={
          direction === 'up' ? IconColor.SuccessDefault : IconColor.ErrorDefault
        }
      />
    </TouchableOpacity>
  );

  const percentSuffix = (
    <Text
      variant={TextVariant.HeadingLg}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextAlternative}
      twClassName="ml-[3px]"
    >
      %
    </Text>
  );

  return (
    <AlertFormShell
      isRecurring={isRecurring}
      onRecurringChange={setIsRecurring}
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
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mb-2"
        >
          {strings(
            direction === 'up'
              ? 'price_alerts.moves_up'
              : 'price_alerts.moves_down',
          )}
        </Text>

        <AlertAmountInput
          text={percentAmount}
          hasInput={hasInput}
          prefix={directionToggle}
          suffix={percentSuffix}
          testID={CreatePriceAlertTestIds.PERCENT_INPUT}
          cursorTwClassName="self-center h-10 w-0.5 bg-primary-default"
        />

        <Box twClassName="mt-4 w-full" alignItems={BoxAlignItems.Center}>
          <AlertPeriodToggle value={period} onChange={setPeriod} />
        </Box>
      </Box>
    </AlertFormShell>
  );
};

export default PercentChangeAlertForm;
