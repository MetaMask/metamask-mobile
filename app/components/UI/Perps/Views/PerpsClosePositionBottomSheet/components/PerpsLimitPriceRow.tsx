import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  HelpText,
  HelpTextSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { useBlinkingCursor } from '../../../../Ramp/hooks/useBlinkingCursor';

/** Muted stand-in that reads as an input the keypad is waiting to fill. */
const EMPTY_LIMIT_PRICE_DISPLAY = '0.00';

export interface PerpsLimitPriceRowProps {
  /** Numeric portion only; the row renders its own `$`. */
  value: string;
  hasValue: boolean;
  error: string;
  /** Drives the caret, which sits after the digits once a price is entered. */
  isEditing: boolean;
  onPress: () => void;
}

/**
 * Tappable limit price row for the close sheet. Unlike the control screen's
 * row, this one is filled by an inline keypad rather than a nested sheet, so
 * it renders a caret instead of navigating away.
 */
const PerpsLimitPriceRow: React.FC<PerpsLimitPriceRowProps> = ({
  value,
  hasValue,
  error,
  isEditing,
  onPress,
}) => {
  const tw = useTailwind();
  const cursorOpacity = useBlinkingCursor(isEditing);

  let priceColor: TextColor = TextColor.TextMuted;
  if (error) {
    priceColor = TextColor.ErrorDefault;
  } else if (hasValue) {
    priceColor = TextColor.TextDefault;
  }

  const isEmptyInReview = !hasValue && !isEditing;

  const cursor = isEditing ? (
    <Animated.View
      testID={PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_CURSOR}
      style={[
        tw.style('w-0.5 h-4 bg-text-default'),
        { opacity: cursorOpacity },
      ]}
    />
  ) : null;

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings('perps.order.limit_price')}
        onPress={onPress}
        testID={PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_ROW}
      >
        <Box twClassName="flex-row items-center justify-between px-4 py-2">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.order.limit_price')}
          </Text>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            {isEmptyInReview ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                testID={
                  PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT
                }
              >
                {strings('perps.order.set_price')}
              </Text>
            ) : (
              <>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  $
                </Text>
                {!hasValue ? cursor : null}
                <Text
                  variant={TextVariant.BodyMd}
                  color={priceColor}
                  testID={
                    PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT
                  }
                >
                  {hasValue ? value : EMPTY_LIMIT_PRICE_DISPLAY}
                </Text>
                {hasValue ? cursor : null}
              </>
            )}
          </Box>
        </Box>
      </TouchableOpacity>

      {error ? (
        <Box twClassName="px-4">
          <HelpText severity={HelpTextSeverity.Danger} showIcon>
            {error}
          </HelpText>
        </Box>
      ) : null}
    </>
  );
};

export default PerpsLimitPriceRow;
