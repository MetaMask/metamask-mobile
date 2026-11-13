import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../../Perps.testIds';
import { useBlinkingCursor } from '../../../../../../component-library/components-temp/AnimatedAmountDisplay';

/** Muted stand-in that reads as an input the keypad is waiting to fill. */
const EMPTY_LIMIT_PRICE_DISPLAY = '0.00';

/** Visual row is 32px (`h-8`). 4px above and below makes the touch target 40px. */
const LIMIT_PRICE_ROW_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

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
  const priceAnnouncement = isEmptyInReview
    ? strings('perps.order.set_price')
    : `$${hasValue ? value : EMPTY_LIMIT_PRICE_DISPLAY}`;
  const rowLabel = `${strings('perps.order.limit_price')}, ${priceAnnouncement}`;

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
        accessibilityLabel={error ? `${rowLabel}. ${error}` : rowLabel}
        onPress={onPress}
        hitSlop={LIMIT_PRICE_ROW_HIT_SLOP}
        testID={PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_ROW}
      >
        <Box twClassName="flex-row items-center justify-between px-4 h-8">
          <Text
            variant={TextVariant.BodySm}
            color={error ? TextColor.ErrorDefault : TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            twClassName="flex-1 mr-3"
          >
            {error || strings('perps.order.limit_price')}
          </Text>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={0.5}
          >
            {isEmptyInReview ? (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Medium}
                  testID={
                    PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT
                  }
                >
                  {strings('perps.order.set_price')}
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                  twClassName="pt-0.5"
                />
              </>
            ) : (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Medium}
                >
                  $
                </Text>
                {!hasValue ? cursor : null}
                <Text
                  variant={TextVariant.BodySm}
                  color={priceColor}
                  fontWeight={FontWeight.Medium}
                  testID={
                    PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT
                  }
                >
                  {hasValue ? value : EMPTY_LIMIT_PRICE_DISPLAY}
                </Text>
                {hasValue ? cursor : null}
                {!isEditing ? (
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                    twClassName="pt-0.5"
                  />
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </TouchableOpacity>
    </>
  );
};

export default PerpsLimitPriceRow;
