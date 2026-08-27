import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  Checkbox,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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
  const parts = days > 0 ? [`${days}d`] : [];

  parts.push(`${hours}h`, `${minutes}m`);
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
        label={strings('perps.pro_order_form.twap.randomize')}
        labelProps={{
          variant: TextVariant.BodySm,
          fontWeight: FontWeight.Regular,
          color: TextColor.TextAlternative,
          twClassName: 'ml-0 flex-1',
        }}
        isSelected={twap.randomize}
        onChange={twap.onRandomizeChange}
        testID={ids.TWAP_RANDOMIZE}
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
