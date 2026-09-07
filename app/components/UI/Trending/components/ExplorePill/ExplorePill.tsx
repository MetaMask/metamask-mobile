import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

export interface ExplorePillProps {
  onPress: () => void;
  testID: string;
  /** Icon or logo on the left (e.g. token logo, with or without a network badge wrapper). */
  leading: React.ReactNode;
  title: string;
  titleEndAccessory?: React.ReactNode;
  valueLabel?: string;
  changeLabel?: string;
  changeTextColor?: TextColor;
  changeIntervalLabel?: string;
}

/**
 * Shared horizontal “pill” shell for Explore sections (e.g. Crypto Movers, Perps).
 * Visual layout only; callers supply `leading` and press behavior.
 */
const ExplorePill: React.FC<ExplorePillProps> = ({
  onPress,
  testID,
  leading,
  title,
  titleEndAccessory,
  valueLabel,
  changeLabel,
  changeTextColor = TextColor.TextAlternative,
  changeIntervalLabel,
}) => {
  const tw = useTailwind();
  const showChange = changeLabel !== undefined && changeLabel.length > 0;
  const showMarketDetails =
    valueLabel !== undefined || titleEndAccessory !== undefined;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => tw.style('shrink', pressed && 'opacity-80')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        paddingHorizontal={2}
        paddingVertical={2}
        twClassName="rounded-full"
      >
        {leading}
        {showMarketDetails ? (
          <Box gap={1}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {title}
              </Text>
              {titleEndAccessory}
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              {valueLabel ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                >
                  {valueLabel}
                </Text>
              ) : null}
              {showChange ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={changeTextColor}
                  numberOfLines={1}
                >
                  {changeLabel}
                </Text>
              ) : null}
              {showChange && changeIntervalLabel ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                >
                  {changeIntervalLabel}
                </Text>
              ) : null}
            </Box>
          </Box>
        ) : (
          <>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {title}
            </Text>
            {showChange ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={changeTextColor}
                numberOfLines={1}
              >
                {changeLabel}
              </Text>
            ) : null}
          </>
        )}
      </Box>
    </Pressable>
  );
};

export default React.memo(ExplorePill);
