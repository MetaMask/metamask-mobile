import {
  Box,
  ButtonBase,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Input,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useRef } from 'react';
import { Keyboard, Platform, type TextInput } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsSlider from '../../../../components/PerpsSlider';
import { getPerpsProInputAccessoryID } from './PerpsProCompactInput';

const ids = PerpsProOrderFormSelectorsIDs;

export interface PerpsProSizeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  unitLabel: string;
  showUsdPrefix: boolean;
  canToggleUnit: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onUnitPress?: () => void;
  balancePercentage: number;
  onBalancePercentageChange: (value: number) => void;
  onBalancePercentageDragEnd?: () => void;
  onBalancePercentageDragCancel?: () => void;
  availableBalance: string;
  onAddFundsPress?: () => void;
}

const PerpsProSizeInput = ({
  value,
  onChangeText,
  unitLabel,
  showUsdPrefix,
  canToggleUnit,
  onFocus,
  onBlur,
  onUnitPress,
  balancePercentage,
  onBalancePercentageChange,
  onBalancePercentageDragEnd,
  onBalancePercentageDragCancel,
  availableBalance,
  onAddFundsPress,
}: PerpsProSizeInputProps) => {
  const tw = useTailwind();
  const inputRef = useRef<TextInput>(null);
  const label = strings('perps.pro_order_form.size_unit', {
    unit: unitLabel,
  });
  const canPressUnitToggle = canToggleUnit && Boolean(onUnitPress);
  const inputAccessoryViewID =
    Platform.OS === 'ios'
      ? getPerpsProInputAccessoryID(ids.SIZE_INPUT)
      : undefined;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnitPress = useCallback(() => {
    if (!canPressUnitToggle) {
      return;
    }

    onUnitPress?.();
    focusInput();
  }, [canPressUnitToggle, focusInput, onUnitPress]);

  return (
    <Box
      twClassName="overflow-visible rounded-xl border border-muted bg-muted"
      testID={ids.SIZE_CARD}
    >
      <ButtonBase
        onPress={focusInput}
        twClassName="min-h-14 w-full bg-transparent px-3 py-2"
        contentWrapperProps={{
          twClassName: 'w-full flex-row items-center justify-between gap-2',
        }}
        testID={ids.SIZE_FIELD}
        accessibilityLabel={label}
        accessibilityHint={strings('perps.pro_order_form.size_input_hint', {
          unit: unitLabel,
        })}
      >
        <Box twClassName="min-w-0 flex-1 flex-row items-center">
          {showUsdPrefix ? (
            <Text
              variant={TextVariant.HeadingSm}
              twClassName="font-semibold"
              testID={ids.SIZE_PREFIX}
            >
              $
            </Text>
          ) : null}
          <Input
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholder="0.00"
            placeholderTextColor={tw.color('text-muted')}
            textVariant={TextVariant.HeadingSm}
            isStateStylesDisabled
            twClassName="min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold"
            testID={ids.SIZE_INPUT}
            accessibilityLabel={label}
            accessibilityHint={strings('perps.pro_order_form.size_input_hint', {
              unit: unitLabel,
            })}
          />
        </Box>
        <Box twClassName="flex-row items-center gap-1">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={ids.SIZE_UNIT_LABEL}
          >
            {label}
          </Text>
          <ButtonIcon
            iconName={IconName.SwapHorizontal}
            size={ButtonIconSize.Xs}
            isDisabled={!canPressUnitToggle}
            onPress={canPressUnitToggle ? handleUnitPress : undefined}
            testID={ids.SIZE_UNIT_BUTTON}
            accessibilityLabel={`${strings(
              'perps.pro_order_form.toggle_size_unit',
            )}: ${unitLabel}`}
            accessibilityHint={strings(
              'perps.pro_order_form.toggle_size_unit_hint',
              { unit: unitLabel },
            )}
          />
        </Box>
      </ButtonBase>
      <Box
        twClassName="overflow-visible px-3 pb-4 pt-6"
        onTouchCancel={onBalancePercentageDragCancel}
        testID={ids.SIZE_SLIDER_SECTION}
      >
        <PerpsSlider
          value={balancePercentage}
          onValueChange={onBalancePercentageChange}
          onDragEnd={onBalancePercentageDragEnd}
          minimumValue={0}
          maximumValue={100}
          showPercentageLabels={false}
          showPercentageMarkers
          variant="compact"
          testID={ids.SIZE_SLIDER}
          accessibilityLabel={strings(
            'perps.pro_order_form.size_percentage_unit',
            { unit: unitLabel },
          )}
        />
      </Box>
      <ButtonBase
        onPress={onAddFundsPress}
        isDisabled={!onAddFundsPress}
        twClassName="h-11 w-full rounded-b-xl border-t border-muted bg-transparent px-3"
        contentWrapperProps={{
          twClassName: 'w-full flex-row items-center justify-between',
        }}
        testID={ids.ADD_FUNDS_BUTTON}
        accessibilityLabel={availableBalance}
        accessibilityHint={strings('perps.add_funds')}
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={ids.AVAILABLE_BALANCE}
        >
          {availableBalance}
        </Text>
        <Box twClassName="flex-row items-center gap-1">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {strings('perps.add_funds')}
          </Text>
          <Icon
            name={IconName.AddCircle}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </ButtonBase>
    </Box>
  );
};

export default PerpsProSizeInput;
