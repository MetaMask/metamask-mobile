import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Position } from '@metamask/social-controllers';
import PositionTokenAvatar from '../../../../UI/SocialFeed/components/PositionTokenAvatar';
import { useTheme } from '../../../../../util/theme';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

/** Figma: the foreground colour at 15% in the top-left, gone by the far edge. */
const GRADIENT_ALPHA_HEX = ['26', '00'];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

const styles = StyleSheet.create({
  surface: StyleSheet.absoluteFill,
});

export interface PositionSheetTradeSummaryProps {
  position: Position | undefined;
  title: string;
  subtitle: string;
  pnlPercentLabel: string;
  pnlValueLabel: string;
  isPnlPositive: boolean;
  onPress: () => void;
}

/** The trade row; tapping it opens the full trade details screen. */
const PositionSheetTradeSummary = ({
  position,
  title,
  subtitle,
  pnlPercentLabel,
  pnlValueLabel,
  isPnlPositive,
  onPress,
}: PositionSheetTradeSummaryProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const pnlColor = isPnlPositive
    ? TextColor.SuccessDefault
    : TextColor.ErrorDefault;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center gap-3 rounded-xl border border-muted p-3 overflow-hidden',
          pressed && 'opacity-70',
        )
      }
    >
      <LinearGradient
        colors={GRADIENT_ALPHA_HEX.map(
          (alpha) => `${colors.icon.default}${alpha}`,
        )}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.surface}
        pointerEvents="none"
      />
      {position ? (
        <PositionTokenAvatar position={position} size={AvatarTokenSize.Md} />
      ) : null}
      <Box twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.End}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={pnlColor}
        >
          {pnlPercentLabel}
        </Text>
        <Text variant={TextVariant.BodyXs} color={pnlColor}>
          {pnlValueLabel}
        </Text>
      </Box>
    </Pressable>
  );
};

export default PositionSheetTradeSummary;
