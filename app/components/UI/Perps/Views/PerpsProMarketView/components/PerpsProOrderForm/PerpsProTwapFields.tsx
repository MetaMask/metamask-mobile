import {
  Box,
  Checkbox,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { type Ref } from 'react';
import type { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProCompactInput from './PerpsProCompactInput';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;

interface PerpsProTwapFieldsProps {
  twap: PerpsProTwapModel;
  sectionRef?: Ref<View>;
  onFieldFocus?: () => void;
  onFieldBlur?: () => void;
  onFieldPress?: () => void;
}

const PerpsProTwapFields = ({
  twap,
  sectionRef,
  onFieldFocus,
  onFieldBlur,
  onFieldPress,
}: PerpsProTwapFieldsProps) => (
  <Box
    ref={sectionRef}
    collapsable={false}
    twClassName="gap-2"
    testID={ids.TWAP_DURATION_SECTION}
  >
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      testID={ids.TWAP_DURATION_LABEL}
    >
      {strings('perps.pro_order_form.twap.running_time')}
    </Text>
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      {strings(
        'perps.pro_order_form.twap.valid_range',
        PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
      )}
    </Text>
    <Box twClassName="flex-row gap-2">
      {(
        [
          {
            label: strings('perps.pro_order_form.twap.days'),
            value: twap.days,
            onChangeText: twap.onDaysChange,
            testID: ids.TWAP_DAYS,
          },
          {
            label: strings('perps.pro_order_form.twap.hours'),
            value: twap.hours,
            onChangeText: twap.onHoursChange,
            testID: ids.TWAP_HOURS,
          },
          {
            label: strings('perps.pro_order_form.twap.minutes'),
            value: twap.minutes,
            onChangeText: twap.onMinutesChange,
            testID: ids.TWAP_MINUTES,
          },
        ] as const
      ).map((field) => (
        <Box key={field.testID} twClassName="flex-1">
          <PerpsProCompactInput
            {...field}
            keyboardType="number-pad"
            labelVariant={TextVariant.BodyXs}
            labelNumberOfLines={1}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onFieldPress={onFieldPress}
          />
        </Box>
      ))}
    </Box>
    <Box twClassName="rounded-xl bg-muted px-3 py-3">
      <Checkbox
        label={strings('perps.pro_order_form.twap.randomize')}
        labelProps={{
          variant: TextVariant.BodySm,
          fontWeight: FontWeight.Medium,
          twClassName: 'ml-0 flex-1',
        }}
        isSelected={twap.randomize}
        onChange={twap.onRandomizeChange}
        testID={ids.TWAP_RANDOMIZE}
        twClassName="w-full flex-row-reverse justify-between"
      />
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="mt-1"
      >
        {strings(
          'perps.pro_order_form.twap.randomize_description',
          PERPS_TWAP_UI_CONFIG.RandomizeI18nValues,
        )}
      </Text>
    </Box>
  </Box>
);

export default PerpsProTwapFields;
