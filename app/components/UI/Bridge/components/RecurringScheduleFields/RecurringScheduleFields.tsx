import React, { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  IconName,
  IconSize,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  selectRecurringEveryUnit,
  selectRecurringEveryValue,
  selectRecurringRepeatCount,
  selectRecurringScheduleValidation,
  setRecurringEveryUnit,
} from '../../../../../core/redux/slices/bridge';
import RecurringIntervalSheet from '../RecurringIntervalSheet';
import {
  RecurringScheduleErrorCode,
  type RecurringIntervalUnit,
} from '../../utils/recurringSchedule';
import { RecurringScheduleFieldsSelectorsIDs } from './RecurringScheduleFields.testIds';

interface RecurringScheduleFieldsProps {
  onEveryPress: () => void;
  onRepeatPress: () => void;
  onDismissKeypad: () => void;
}

function RecurringNumberCard({
  label,
  value,
  testID,
  inputTestID,
  onInputPress,
  accessory,
  hasError,
}: {
  label: string;
  value: string;
  testID: string;
  inputTestID: string;
  onInputPress: () => void;
  accessory: React.ReactNode;
  hasError: boolean;
}) {
  const tw = useTailwind();

  return (
    <Box
      testID={testID}
      gap={2}
      padding={3}
      twClassName="min-w-px flex-1 rounded-2xl bg-muted"
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={2}
      >
        <Input
          value={value}
          showSoftInputOnFocus={false}
          caretHidden={false}
          keyboardType="number-pad"
          isStateStylesDisabled
          textVariant={TextVariant.HeadingLg}
          onPressIn={onInputPress}
          onFocus={onInputPress}
          placeholderTextColor={tw.color('text-muted')}
          twClassName={`h-8 min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold${
            hasError ? ' text-error-default' : ''
          }`}
          testID={inputTestID}
          accessibilityLabel={label}
        />
        {accessory}
      </Box>
    </Box>
  );
}

const RecurringScheduleFields = ({
  onEveryPress,
  onRepeatPress,
  onDismissKeypad,
}: RecurringScheduleFieldsProps) => {
  const dispatch = useDispatch();
  const [isIntervalSheetVisible, setIsIntervalSheetVisible] = useState(false);
  const everyValue = useSelector(selectRecurringEveryValue);
  const everyUnit = useSelector(selectRecurringEveryUnit);
  const repeatCount = useSelector(selectRecurringRepeatCount);
  const { errors: scheduleErrors } = useSelector(
    selectRecurringScheduleValidation,
  );
  const hasEveryError = scheduleErrors.some(
    (error) =>
      error === RecurringScheduleErrorCode.EveryInvalid ||
      error === RecurringScheduleErrorCode.EveryExceedsUnitMax ||
      error === RecurringScheduleErrorCode.DurationExceedsMax,
  );
  const hasRepeatError = scheduleErrors.some(
    (error) =>
      error === RecurringScheduleErrorCode.RepeatInvalid ||
      error === RecurringScheduleErrorCode.DurationExceedsMax,
  );

  const handleUnitPress = useCallback(() => {
    onDismissKeypad();
    setIsIntervalSheetVisible(true);
  }, [onDismissKeypad]);

  const handleIntervalSheetClosed = useCallback(() => {
    setIsIntervalSheetVisible(false);
  }, []);

  const handleIntervalConfirm = useCallback(
    (unit: RecurringIntervalUnit) => {
      dispatch(setRecurringEveryUnit(unit));
    },
    [dispatch],
  );

  return (
    <Box
      testID={RecurringScheduleFieldsSelectorsIDs.CONTAINER}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onDismissKeypad}
    >
      <Box padding={4} flexDirection={BoxFlexDirection.Row} gap={2}>
        <RecurringNumberCard
          label={strings('bridge.recurring.every')}
          value={everyValue}
          testID={RecurringScheduleFieldsSelectorsIDs.EVERY_CARD}
          inputTestID={RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT}
          onInputPress={onEveryPress}
          hasError={hasEveryError}
          accessory={
            <ButtonBase
              size={ButtonBaseSize.Sm}
              endIconName={IconName.ArrowDown}
              endIconProps={{ size: IconSize.Sm }}
              onPress={handleUnitPress}
              testID={RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON}
              accessibilityLabel={strings(
                `bridge.recurring.unit_option.${everyUnit}`,
              )}
            >
              {strings(`bridge.recurring.unit.${everyUnit}`)}
            </ButtonBase>
          }
        />
        <RecurringNumberCard
          label={strings('bridge.recurring.repeat')}
          value={repeatCount}
          testID={RecurringScheduleFieldsSelectorsIDs.REPEAT_CARD}
          inputTestID={RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT}
          onInputPress={onRepeatPress}
          hasError={hasRepeatError}
          accessory={
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={RecurringScheduleFieldsSelectorsIDs.REPEAT_TIMES_LABEL}
            >
              {strings('bridge.recurring.times')}
            </Text>
          }
        />
      </Box>
      <RecurringIntervalSheet
        isVisible={isIntervalSheetVisible}
        currentUnit={everyUnit}
        onClose={handleIntervalSheetClosed}
        onConfirm={handleIntervalConfirm}
      />
    </Box>
  );
};

export default RecurringScheduleFields;
