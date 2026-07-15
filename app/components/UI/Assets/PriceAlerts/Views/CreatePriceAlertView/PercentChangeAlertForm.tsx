import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonVariant,
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
import KeypadComponent, {
  type KeypadChangeData,
} from '../../../../../Base/Keypad';
import AlertAmountInput from '../../components/AlertAmountInput';
import AlertPeriodToggle from '../../components/AlertPeriodToggle';
import RecurringToggle from '../../components/RecurringToggle';
import {
  type AlertDirection,
  type AlertPeriod,
  CreatePriceAlertTestIds,
  type PercentChangeAlert,
  PriceAlertAnalytics,
} from '../../constants';
import { useSubmitPercentAlert } from '../../api';
import useAlertSaveFlow from '../../hooks/useAlertSaveFlow';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  KEYPAD_EMPTY,
  PERCENT_KEYPAD_DECIMALS,
  toPercentKeypadString,
} from './utils';

interface PercentChangeAlertFormProps {
  assetId: string;
  displayTicker: string;
  fromManage?: boolean;
  editingAlert?: PercentChangeAlert;
  existingPercentAlerts?: PercentChangeAlert[];
}

const PercentChangeAlertForm: React.FC<PercentChangeAlertFormProps> = ({
  assetId,
  displayTicker,
  fromManage,
  editingAlert,
  existingPercentAlerts,
}) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
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
  const hasValidPercent = percentValue > 0;

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
    isRecurring === editingAlert?.recurring;

  const { submit, isSubmitting } = useSubmitPercentAlert(editingAlert);
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
    if (!hasValidPercent) return;

    try {
      await submit({
        asset: assetId,
        threshold: percentValue,
        period,
        direction,
        recurring: isRecurring,
      });
      if (editingAlert) {
        patchAlertCache(editingAlert.id, {
          threshold: percentValue,
          recurring: isRecurring,
        });
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              alert_type: PriceAlertAnalytics.TYPE.PERCENT,
              period,
              direction,
              alert_value: percentValue,
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
              alert_type: PriceAlertAnalytics.TYPE.PERCENT,
              period,
              direction,
              alert_value: percentValue,
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
    direction,
    displayTicker,
    editingAlert,
    hasValidPercent,
    isRecurring,
    navigateAfterSave,
    patchAlertCache,
    percentValue,
    period,
    showErrorToast,
    showSuccessToast,
    submit,
    trackEvent,
  ]);

  const handleKeypadChange = useCallback(({ value }: KeypadChangeData) => {
    setPercentAmount(value);
  }, []);

  const handleToggleDirection = useCallback(() => {
    setDirection((previous) => (previous === 'up' ? 'down' : 'up'));
  }, []);

  const saveButtonLabel = isDuplicatePercentTuple
    ? strings('price_alerts.percent_duplicate')
    : strings(
        isEditing
          ? 'price_alerts.update_price_alert'
          : 'price_alerts.set_price_alert',
      );

  const directionToggle = (
    <TouchableOpacity
      onPress={handleToggleDirection}
      disabled={isEditing}
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
          <AlertPeriodToggle
            value={period}
            onChange={setPeriod}
            isDisabled={isEditing}
          />
        </Box>
      </Box>

      <View style={tw.style('px-4 pb-2')}>
        <RecurringToggle value={isRecurring} onValueChange={setIsRecurring} />

        {/* "price_alert" is intentionally not in the Keypad CURRENCIES map —
            unknown codes fall through to the decimals-aware branch in useCurrency,
            which is the only path that actually enforces the decimals cap. */}
        <KeypadComponent
          value={percentAmount}
          onChange={handleKeypadChange}
          currency="price_alert"
          decimals={PERCENT_KEYPAD_DECIMALS}
        />

        <Button
          variant={ButtonVariant.Primary}
          onPress={handleSave}
          isLoading={isSubmitting}
          isDisabled={
            isSubmitting ||
            !hasValidPercent ||
            isDuplicatePercentTuple ||
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

export default PercentChangeAlertForm;
