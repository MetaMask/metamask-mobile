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
import { Platform, type TextInput, type View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useHaptics } from '../../../../../../../util/haptics';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsSlider from '../../../../components/PerpsSlider';
import { getPerpsProInputAccessoryID } from './PerpsProCompactInput';
import type {
  PerpsProSizeDenomination,
  PerpsProSizeSliderModel,
} from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;

const getUnitLabel = (denomination: PerpsProSizeDenomination): string =>
  denomination.unit === 'usd' ? 'USD' : denomination.symbol;

export interface PerpsProSizeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  denomination: PerpsProSizeDenomination;
  canToggleDenomination: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onToggleDenomination?: () => void;
  sizeSlider: PerpsProSizeSliderModel;
  availableBalance: string;
  onAddFundsPress?: () => void;
  /**
   * The whole card, not the inner `TextInput`: the slider and balance row sit
   * below it and must stay clear of the keyboard too.
   */
  containerRef?: React.Ref<View>;
  /** Optional shared-form ref used by keyboard field traversal. */
  inputRef?: React.RefObject<TextInput | null>;
  /** Fires on every field tap, including while already focused. Idempotent. */
  onFieldPress?: () => void;
  isDisabled?: boolean;
}

const PerpsProSizeInput = ({
  value,
  onChangeText,
  denomination,
  canToggleDenomination,
  onFocus,
  onBlur,
  onToggleDenomination,
  sizeSlider,
  availableBalance,
  onAddFundsPress,
  containerRef,
  inputRef: externalInputRef,
  onFieldPress,
  isDisabled = false,
}: PerpsProSizeInputProps) => {
  const tw = useTailwind();
  const { playSelection } = useHaptics();
  const internalInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const unitLabel = getUnitLabel(denomination);
  const showUsdPrefix = denomination.unit === 'usd';
  const label = strings('perps.pro_order_form.size_unit', {
    unit: unitLabel,
  });
  const canPressDenominationToggle =
    !isDisabled && canToggleDenomination && Boolean(onToggleDenomination);
  const inputAccessoryViewID =
    Platform.OS === 'ios'
      ? getPerpsProInputAccessoryID(ids.SIZE_INPUT)
      : undefined;

  const focusInput = useCallback(() => {
    if (isDisabled) {
      return;
    }
    inputRef.current?.focus();
    onFieldPress?.();
  }, [inputRef, isDisabled, onFieldPress]);

  const handleToggleDenomination = useCallback(() => {
    if (!canPressDenominationToggle) {
      return;
    }

    playSelection().catch(() => undefined);
    onToggleDenomination?.();
  }, [canPressDenominationToggle, onToggleDenomination, playSelection]);

  const handleChangeText = useCallback(
    (nextValue: string) => {
      if (!isDisabled) {
        onChangeText(nextValue);
      }
    },
    [isDisabled, onChangeText],
  );

  const handleFocus = useCallback(() => {
    if (!isDisabled) {
      onFocus?.();
    }
  }, [isDisabled, onFocus]);

  const handleBlur = useCallback(() => {
    if (!isDisabled) {
      onBlur?.();
    }
  }, [isDisabled, onBlur]);

  const handleFieldPress = useCallback(() => {
    if (!isDisabled) {
      onFieldPress?.();
    }
  }, [isDisabled, onFieldPress]);

  const handleSliderValueChange = useCallback(
    (nextValue: number) => {
      if (!isDisabled) {
        sizeSlider.onValueChange(nextValue);
      }
    },
    [isDisabled, sizeSlider],
  );

  const handleSliderDragEnd = useCallback(
    (nextValue: number) => {
      if (!isDisabled) {
        sizeSlider.onDragEnd(nextValue);
      }
    },
    [isDisabled, sizeSlider],
  );

  const handleSliderDragCancel = useCallback(() => {
    if (!isDisabled) {
      sizeSlider.onDragCancel();
    }
  }, [isDisabled, sizeSlider]);

  const handleAddFundsPress = useCallback(() => {
    if (isDisabled || !onAddFundsPress) {
      return;
    }

    onAddFundsPress();
  }, [isDisabled, onAddFundsPress]);

  return (
    <Box
      ref={containerRef}
      twClassName="overflow-visible rounded-xl bg-muted"
      testID={ids.SIZE_CARD}
    >
      <Box twClassName="relative">
        <ButtonBase
          onPress={focusInput}
          isDisabled={isDisabled}
          twClassName="h-[78px] w-full bg-transparent p-0"
          contentWrapperProps={{
            twClassName: 'w-full flex-col items-start',
          }}
          testID={ids.SIZE_FIELD}
          accessibilityLabel={label}
          accessibilityHint={strings('perps.pro_order_form.size_input_hint', {
            unit: unitLabel,
          })}
        >
          <Box twClassName="h-[46px] w-full justify-center px-3 py-3">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={ids.SIZE_UNIT_LABEL}
            >
              {label}
            </Text>
          </Box>
          <Box twClassName="h-8 w-full min-w-0 flex-row items-center gap-0.5 px-3 pr-8">
            {showUsdPrefix ? (
              <Text
                variant={TextVariant.BodyLg}
                twClassName="font-semibold"
                testID={ids.SIZE_PREFIX}
              >
                {strings('perps.tpsl.usd_label')}
              </Text>
            ) : null}
            <Input
              ref={inputRef}
              value={value}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              isDisabled={isDisabled}
              // A tap landing here is consumed by the input, so the wrapping
              // ButtonBase never fires.
              onPressIn={handleFieldPress}
              keyboardType="decimal-pad"
              inputAccessoryViewID={inputAccessoryViewID}
              placeholder="0.00"
              placeholderTextColor={tw.color('text-muted')}
              textVariant={TextVariant.HeadingLg}
              isStateStylesDisabled
              twClassName="h-8 min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold"
              testID={ids.SIZE_INPUT}
              accessibilityLabel={label}
              accessibilityHint={strings(
                'perps.pro_order_form.size_input_hint',
                {
                  unit: unitLabel,
                },
              )}
            />
          </Box>
        </ButtonBase>
        <Box twClassName="absolute right-3 top-3 z-10">
          <ButtonIcon
            iconName={IconName.SwapHorizontal}
            size={ButtonIconSize.Sm}
            isDisabled={!canPressDenominationToggle}
            onPress={
              canPressDenominationToggle ? handleToggleDenomination : undefined
            }
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
      </Box>
      <Box
        twClassName="overflow-visible px-3 pb-4 pt-6"
        onTouchCancel={handleSliderDragCancel}
        testID={ids.SIZE_SLIDER_SECTION}
      >
        <PerpsSlider
          value={sizeSlider.value}
          onValueChange={handleSliderValueChange}
          onDragEnd={handleSliderDragEnd}
          minimumValue={0}
          maximumValue={sizeSlider.maximumValue}
          step={1}
          showPercentageLabels={false}
          showPercentageMarkers
          variant="compact"
          disabled={isDisabled}
          testID={ids.SIZE_SLIDER}
          accessibilityLabel={strings(
            'perps.pro_order_form.size_percentage_unit',
            { unit: unitLabel },
          )}
        />
      </Box>
      <Box twClassName="w-full border-t border-muted" />
      <ButtonBase
        onPress={handleAddFundsPress}
        isDisabled={isDisabled || !onAddFundsPress}
        twClassName="h-[46px] w-full rounded-b-2xl bg-transparent px-3"
        contentWrapperProps={{
          twClassName: 'w-full flex-row items-center justify-start gap-1',
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
        <Icon
          name={IconName.AddCircle}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </ButtonBase>
    </Box>
  );
};

export default PerpsProSizeInput;
