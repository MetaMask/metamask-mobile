import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyEarningsTestIds } from './MoneyEarnings.testIds';

interface MoneyEarningsProps {
  /**
   * Interest earned over the last 30 days, formatted in USD.
   */
  last30DaysEarnings: string;
  /**
   * Interest earned since the Money Account position was created, formatted
   * in USD.
   */
  sinceInceptionEarnings: string;
  /**
   * Render skeletons in place of the two earnings values while data is being
   * fetched.
   */
  isLoading?: boolean;
  /**
   * Opens the Monthly earnings info bottom sheet.
   */
  onMonthlyInfoPress?: () => void;
  /**
   * Opens the Lifetime earnings info bottom sheet.
   */
  onLifetimeInfoPress?: () => void;
  /**
   * Whether the earnings values should be masked.
   */
  privacyMode?: boolean;
}

const UNDERLINE_HEIGHT = 4;
const UNDERLINE_GAP = 1;
/** Extra width so the underline sits slightly past the text edges. */
const UNDERLINE_OVERFLOW = 2;

const styles = StyleSheet.create({
  labelPressable: {
    alignSelf: 'flex-start',
  },
  labelColumn: {
    alignItems: 'flex-start',
  },
  underline: {
    marginTop: UNDERLINE_GAP,
  },
});

const ValueText = ({
  children,
  testID,
  privacyMode,
}: {
  children: string;
  testID: string;
  privacyMode: boolean;
}) => {
  const isPositive = children.startsWith('+');
  return (
    <SensitiveText
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={isPositive ? TextColor.SuccessDefault : TextColor.TextDefault}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={testID}
    >
      {children}
    </SensitiveText>
  );
};

/**
 * Info label with a custom SVG dotted underline so we can control vertical
 * offset and dot density (native textDecoration dotted is too coarse/tight).
 */
const DottedInfoLabel = ({
  children,
  onPress,
  testID,
  accessibilityLabel,
}: {
  children: string;
  onPress?: () => void;
  testID: string;
  accessibilityLabel: string;
}) => {
  const { colors } = useTheme();
  const [textWidth, setTextWidth] = useState(0);

  const handleTextLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setTextWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  const underlineWidth = textWidth > 0 ? textWidth + UNDERLINE_OVERFLOW * 2 : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      testID={testID}
      style={styles.labelPressable}
    >
      <View style={styles.labelColumn}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          onLayout={handleTextLayout}
        >
          {children}
        </Text>
        {underlineWidth > 0 ? (
          <Svg
            width={underlineWidth}
            height={UNDERLINE_HEIGHT}
            style={[styles.underline, { marginLeft: -UNDERLINE_OVERFLOW }]}
          >
            <Line
              x1={0}
              y1={UNDERLINE_HEIGHT / 2}
              x2={underlineWidth}
              y2={UNDERLINE_HEIGHT / 2}
              stroke={colors.text.alternative}
              strokeWidth={1.5}
              // Zero-length dashes + round caps render as fine circular dots.
              strokeDasharray="0, 3"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
};

const MoneyEarnings = ({
  last30DaysEarnings,
  sinceInceptionEarnings,
  isLoading = false,
  onMonthlyInfoPress,
  onLifetimeInfoPress,
  privacyMode = false,
}: MoneyEarningsProps) => (
  <Box twClassName="px-4 pt-7 pb-3" testID={MoneyEarningsTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.earnings.title')} />

    <Box twClassName="mt-5 gap-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.LAST_30_DAYS}
      >
        <DottedInfoLabel
          onPress={onMonthlyInfoPress}
          accessibilityLabel={strings('money.earnings.monthly_info_label')}
          testID={MoneyEarningsTestIds.MONTHLY_LABEL}
        >
          {strings('money.earnings.estimated_monthly')}
        </DottedInfoLabel>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.LAST_30_DAYS_SKELETON}
          />
        ) : (
          <ValueText
            testID={MoneyEarningsTestIds.LAST_30_DAYS_VALUE}
            privacyMode={privacyMode}
          >
            {last30DaysEarnings}
          </ValueText>
        )}
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-between"
        testID={MoneyEarningsTestIds.SINCE_INCEPTION}
      >
        <DottedInfoLabel
          onPress={onLifetimeInfoPress}
          accessibilityLabel={strings('money.earnings.lifetime_info_label')}
          testID={MoneyEarningsTestIds.LIFETIME_LABEL}
        >
          {strings('money.earnings.estimated_lifetime')}
        </DottedInfoLabel>
        {isLoading ? (
          <Skeleton
            height={24}
            width={80}
            testID={MoneyEarningsTestIds.SINCE_INCEPTION_SKELETON}
          />
        ) : (
          <ValueText
            testID={MoneyEarningsTestIds.SINCE_INCEPTION_VALUE}
            privacyMode={privacyMode}
          >
            {sinceInceptionEarnings}
          </ValueText>
        )}
      </Box>
    </Box>
  </Box>
);

export default MoneyEarnings;
