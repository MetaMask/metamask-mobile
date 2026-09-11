import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  Checkbox,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import React from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;

interface PerpsProTwapFieldsProps {
  twap: PerpsProTwapModel;
  onDurationPress: () => void;
}

const toNonNegativeInteger = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const formatCompactTwapDuration = (
  twap: Pick<PerpsProTwapModel, 'days' | 'hours' | 'minutes'>,
): string => {
  const days = toNonNegativeInteger(twap.days);
  const hours = toNonNegativeInteger(twap.hours);
  const minutes = toNonNegativeInteger(twap.minutes);
  const daySuffix = strings('perps.pro_order_form.twap.days_short');
  const hourSuffix = strings('perps.pro_order_form.twap.hours_short');
  const minuteSuffix = strings('perps.pro_order_form.twap.minutes_short');
  const parts = days > 0 ? [`${days}${daySuffix}`] : [];

  parts.push(`${hours}${hourSuffix}`, `${minutes}${minuteSuffix}`);
  return parts.join(' ');
};

const durationDayLabel = (count: number) =>
  count === 1
    ? strings('perps.pro_order_form.twap.duration_day')
    : strings('perps.pro_order_form.twap.duration_days', { count });

const durationHourLabel = (count: number) =>
  count === 1
    ? strings('perps.pro_order_form.twap.duration_hour')
    : strings('perps.pro_order_form.twap.duration_hours', { count });

const durationMinuteLabel = (count: number) =>
  count === 1
    ? strings('perps.pro_order_form.twap.duration_minute')
    : strings('perps.pro_order_form.twap.duration_minutes', { count });

/**
 * Spells the runtime out for the summary section — "30 mins", "1 hr 30 mins" —
 * rather than the compact "0h 30m" used inside the runtime field itself.
 */
export const formatTwapRuntimeSummary = (durationMinutes: number): string => {
  if (durationMinutes <= 0) {
    return PERPS_CONSTANTS.FallbackDataDisplay;
  }

  const { MinutesPerHour, HoursPerDay } = PERPS_TWAP_UI_CONFIG;
  const minutesPerDay = MinutesPerHour * HoursPerDay;
  const days = Math.floor(durationMinutes / minutesPerDay);
  const hours = Math.floor((durationMinutes % minutesPerDay) / MinutesPerHour);
  const minutes = durationMinutes % MinutesPerHour;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(durationDayLabel(days));
  }
  if (hours > 0) {
    parts.push(durationHourLabel(hours));
  }
  if (minutes > 0) {
    parts.push(durationMinuteLabel(minutes));
  }

  return parts.join(' ');
};

const PerpsProTwapFields = ({
  twap,
  onDurationPress,
}: PerpsProTwapFieldsProps) => (
  <Box twClassName="border-t border-muted" testID={ids.TWAP_DURATION_SECTION}>
    <ButtonBase
      size={ButtonBaseSize.Sm}
      onPress={onDurationPress}
      twClassName="h-[54px] w-full bg-transparent px-3"
      contentWrapperProps={{ twClassName: 'w-full justify-start' }}
      testID={ids.TWAP_DURATION_BUTTON}
    >
      <Box twClassName="items-start">
        <Box twClassName="w-full flex-row items-center justify-between">
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            testID={ids.TWAP_DURATION_LABEL}
          >
            {strings(
              'perps.pro_order_form.twap.runtime_label',
              PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
            )}
          </Text>
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Xs}
            onPress={twap.onRuntimeInfoPress}
            testID={ids.TWAP_DURATION_INFO}
            accessibilityLabel={strings(
              'perps.pro_order_form.twap.runtime_info',
            )}
          />
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          testID={ids.TWAP_DURATION_VALUE}
        >
          {formatCompactTwapDuration(twap)}
        </Text>
      </Box>
    </ButtonBase>
    <Box twClassName="h-[54px] justify-center border-t border-muted px-3">
      <Checkbox
        // A string label is wrapped in the design system's own Text with a
        // hardcoded `ml-3` that overrides `labelProps`. Under
        // `flex-row-reverse` the label leads the row, so that margin indents it
        // past the Runtime label above. Passing an element instead skips the
        // wrapper, leaving both labels on the same left edge.
        label={
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            twClassName="flex-1"
          >
            {strings('perps.pro_order_form.twap.randomize')}
          </Text>
        }
        isSelected={twap.randomize}
        onChange={twap.onRandomizeChange}
        testID={ids.TWAP_RANDOMIZE}
        accessibilityLabel={strings('perps.pro_order_form.twap.randomize')}
        accessibilityHint={strings(
          'perps.pro_order_form.twap.randomize_description',
          PERPS_TWAP_UI_CONFIG.RandomizeI18nValues,
        )}
        twClassName="w-full flex-row-reverse justify-between"
      />
    </Box>
  </Box>
);

export default PerpsProTwapFields;
