import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import { PERPS_TWAP_UI_CONFIG } from '../../../../constants/perpsConfig';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProCompactInput, {
  PerpsProInputKeyboardAccessory,
} from './PerpsProCompactInput';
import type { PerpsProTwapModel } from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;

interface PerpsProTwapDurationBottomSheetProps {
  isVisible?: boolean;
  twap: PerpsProTwapModel;
  onClose: () => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsProTwapDurationBottomSheet = ({
  isVisible = true,
  twap,
  onClose,
  sheetRef: externalSheetRef,
}: PerpsProTwapDurationBottomSheetProps) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [externalSheetRef, isVisible, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  if (!isVisible) {
    return null;
  }

  const durationFields = [
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
  ] as const;

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={ids.TWAP_DURATION_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: ids.TWAP_DURATION_SHEET_CLOSE }}
      >
        {strings('perps.pro_order_form.twap.running_time')}
      </BottomSheetHeader>
      <Box twClassName="gap-3 px-4 pb-4">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings(
            'perps.pro_order_form.twap.valid_range',
            PERPS_TWAP_UI_CONFIG.DurationRangeI18nValues,
          )}
        </Text>
        <Box twClassName="flex-row gap-2">
          {durationFields.map((field) => (
            <Box key={field.testID} twClassName="flex-1">
              <PerpsProCompactInput
                {...field}
                keyboardType="number-pad"
                labelVariant={TextVariant.BodyXs}
                labelNumberOfLines={1}
              />
            </Box>
          ))}
        </Box>
        {twap.durationError ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.ErrorDefault}
            testID={ids.TWAP_DURATION_ERROR}
          >
            {twap.durationError}
          </Text>
        ) : null}
      </Box>
      {durationFields.map(({ testID }) => (
        <PerpsProInputKeyboardAccessory key={testID} inputTestID={testID} />
      ))}
    </BottomSheet>
  );
};

export default PerpsProTwapDurationBottomSheet;
