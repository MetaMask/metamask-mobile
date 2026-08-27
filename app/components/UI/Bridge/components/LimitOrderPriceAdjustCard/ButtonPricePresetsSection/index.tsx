import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  Input,
  Text,
  TextColor,
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

const PRESET_ITEM_TW_CLASS_NAME = 'min-w-0 flex-1 shrink';

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
    const percentSign =
      executionType === LimitOrderExecutionType.SELL ? '+' : '-';
    const displayValue =
      customValue && customValue !== '0'
        ? formatAmountWithLocaleSeparators(customValue)
        : customValue;

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
          twClassName={`${PRESET_ITEM_TW_CLASS_NAME} px-0`}
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
            twClassName={`${PRESET_ITEM_TW_CLASS_NAME} px-0`}
          >
            {`${percentSign}${percent}%`}
          </Button>
        ))}
        {isCustomActive ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName={`h-8 overflow-hidden rounded-lg bg-muted px-1 ${PRESET_ITEM_TW_CLASS_NAME}`}
          >
            <Input
              ref={inputRef}
              testID={LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM_INPUT}
              value={displayValue}
              isStateStylesDisabled
              showSoftInputOnFocus={false}
              caretHidden={false}
              autoFocus={false}
              placeholder="0"
              textAlign="center"
              textVariant={TextVariant.BodySm}
              selection={customSelection}
              onSelectionChange={onCustomSelectionChange}
              onPressIn={onCustomInputPress}
              onFocus={onCustomInputPress}
              style={tw.style({ includeFontPadding: false })}
              twClassName="h-full min-w-0 flex-1 border-0 bg-transparent p-0"
            />
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              %
            </Text>
          </Box>
        ) : (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Sm}
            onPress={onCustomPress}
            testID={LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM}
            twClassName={`${PRESET_ITEM_TW_CLASS_NAME} px-0`}
          >
            {strings('bridge.limit.custom')}
          </Button>
        )}
      </Box>
    );
  },
);
