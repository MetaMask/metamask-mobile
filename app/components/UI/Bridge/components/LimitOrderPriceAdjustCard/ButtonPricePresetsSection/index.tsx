import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  Platform,
  TextInput,
  type TextInputSelectionChangeEvent,
} from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  Input,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonPricePresetsSectionProps,
  ButtonPricePresetsSectionRef,
} from './types';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';
import { formatAmountWithLocaleSeparators } from '../../../utils/formatAmountWithLocaleSeparators';
import { strings } from '../../../../../../../locales/i18n';
import {
  getLimitOrderPercentPresetTestId,
  LimitOrderPriceAdjustPresetsSelectorsIDs,
} from './testIds';

const PRESET_SLOT_TW_CLASS_NAME = 'min-w-0 flex-1 shrink basis-0';
const PRESET_CONTROL_TW_CLASS_NAME = 'w-full px-0';
const VALUE_FONT_SIZE = 14;
const VALUE_LINE_HEIGHT = VALUE_FONT_SIZE * 1.25;
const PERCENT_POSTFIX = '%';

export const ButtonPricePresetsSection = forwardRef<
  ButtonPricePresetsSectionRef,
  ButtonPricePresetsSectionProps
>(
  (
    {
      executionType,
      pricePresets,
      isCustomActive,
      customValue,
      customSelection,
      onMarketPress,
      onPercentPress,
      onCustomPress,
      onCustomInputPress,
      onCustomSelectionChange,
      testID = LimitOrderPriceAdjustPresetsSelectorsIDs.CONTAINER,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const inputRef = useRef<TextInput>(null);
    const valueTextStyle = tw.style({
      fontSize: VALUE_FONT_SIZE,
      lineHeight: VALUE_LINE_HEIGHT,
      height: VALUE_LINE_HEIGHT,
      paddingVertical: 0,
      includeFontPadding: false,
      textAlignVertical: 'center',
      ...(Platform.OS === 'android' && { paddingTop: 1 }),
    });
    const percentSign =
      executionType === LimitOrderExecutionType.SELL ? '+' : '-';
    const formatSignedPercent = (value: string | number) =>
      `${percentSign}${value}${PERCENT_POSTFIX}`;
    const displayValue =
      customValue && customValue !== '0'
        ? formatAmountWithLocaleSeparators(customValue)
        : customValue;
    const numericDisplayValue = displayValue ?? '';
    const hasNumericDisplayValue = numericDisplayValue.length > 0;
    const signPrefixLength = percentSign.length;
    const minSelectionIndex = signPrefixLength;
    const maxSelectionIndex = signPrefixLength + numericDisplayValue.length;
    const inputValue = hasNumericDisplayValue
      ? formatSignedPercent(numericDisplayValue)
      : '';
    const clampedSelection =
      customSelection === undefined
        ? undefined
        : {
            start:
              signPrefixLength +
              Math.min(
                Math.max(customSelection.start, 0),
                numericDisplayValue.length,
              ),
            end:
              signPrefixLength +
              Math.min(
                Math.max(customSelection.end, 0),
                numericDisplayValue.length,
              ),
          };

    const handleSelectionChange = useCallback(
      (event: TextInputSelectionChangeEvent) => {
        const { start, end } = event.nativeEvent.selection;
        const nextStart = Math.min(
          Math.max(start, minSelectionIndex),
          maxSelectionIndex,
        );
        const nextEnd = Math.min(
          Math.max(end, minSelectionIndex),
          maxSelectionIndex,
        );

        onCustomSelectionChange?.({
          ...event,
          nativeEvent: {
            ...event.nativeEvent,
            selection: {
              start: nextStart - signPrefixLength,
              end: nextEnd - signPrefixLength,
            },
          },
        });
      },
      [
        maxSelectionIndex,
        minSelectionIndex,
        onCustomSelectionChange,
        signPrefixLength,
      ],
    );

    useImperativeHandle(ref, () => ({
      blur: () => inputRef.current?.blur(),
      focus: () => inputRef.current?.focus(),
      isFocused: () => Boolean(inputRef.current?.isFocused()),
    }));

    return (
      <Box
        testID={testID}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
      >
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          onPress={onMarketPress}
          testID={LimitOrderPriceAdjustPresetsSelectorsIDs.MARKET}
          twClassName={`${PRESET_SLOT_TW_CLASS_NAME} ${PRESET_CONTROL_TW_CLASS_NAME}`}
        >
          {strings('bridge.limit.market')}
        </Button>
        {pricePresets.map((percent) => (
          <Button
            key={percent}
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Sm}
            onPress={() => onPercentPress(percent)}
            testID={getLimitOrderPercentPresetTestId(percent)}
            twClassName={`${PRESET_SLOT_TW_CLASS_NAME} ${PRESET_CONTROL_TW_CLASS_NAME}`}
          >
            {formatSignedPercent(percent)}
          </Button>
        ))}
        <Box
          testID={LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM_SLOT}
          twClassName={PRESET_SLOT_TW_CLASS_NAME}
        >
          {isCustomActive ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="h-8 w-full overflow-hidden rounded-lg bg-muted px-1"
            >
              <Input
                ref={inputRef}
                testID={LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM_INPUT}
                value={inputValue}
                isStateStylesDisabled
                showSoftInputOnFocus={false}
                caretHidden={false}
                autoFocus={false}
                placeholder={formatSignedPercent(0)}
                textAlign="center"
                textVariant={TextVariant.BodySm}
                selection={clampedSelection}
                onSelectionChange={handleSelectionChange}
                onPressIn={onCustomInputPress}
                onFocus={onCustomInputPress}
                style={valueTextStyle}
                twClassName="h-full min-w-0 flex-1 border-0 bg-transparent p-0"
              />
            </Box>
          ) : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonBaseSize.Sm}
              onPress={onCustomPress}
              testID={LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM}
              twClassName={PRESET_CONTROL_TW_CLASS_NAME}
            >
              {strings('bridge.limit.custom')}
            </Button>
          )}
        </Box>
      </Box>
    );
  },
);
