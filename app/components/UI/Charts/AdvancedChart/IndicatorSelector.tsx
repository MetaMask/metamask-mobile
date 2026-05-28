import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';

/**
 * Indicator definitions surfaced in the Token Details chart.
 *
 * `key` is forwarded to `AdvancedChart` via `ADD_INDICATOR` / `REMOVE_INDICATOR`
 * and must match the preset names handled in `chartLogic.js`.
 */
export interface IndicatorConfig {
  key: string;
  label: string;
}

export const TOKEN_DETAIL_INDICATORS: IndicatorConfig[] = [
  { key: 'MA5', label: 'MA5' },
  { key: 'MA10', label: 'MA10' },
  { key: 'MA20', label: 'MA20' },
  { key: 'RSI', label: 'RSI' },
];

interface IndicatorSelectorProps {
  activeIndicators: Set<string>;
  onToggle: (key: string) => void;
  /** Override active-dot color (A/B ambient color test). */
  activeColor?: string;
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  activeIndicators,
  onToggle,
  activeColor,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(
    (key: string) => () => onToggle(key),
    [onToggle],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-4"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TOKEN_DETAIL_INDICATORS.map((indicator) => {
          const isActive = activeIndicators.has(indicator.key);
          return (
            <Pressable
              key={indicator.key}
              onPress={handlePress(indicator.key)}
              style={({ pressed }) => [
                styles.pill,
                {
                  borderColor: isActive
                    ? (activeColor ?? colors.primary.default)
                    : colors.border.muted,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${isActive ? 'Remove' : 'Add'} ${indicator.label} indicator`}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.pillContent}>
                {isActive && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: activeColor ?? colors.primary.default,
                      },
                    ]}
                  />
                )}
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  style={{
                    color: isActive
                      ? (activeColor ?? colors.primary.default)
                      : colors.text.alternative,
                  }}
                >
                  {indicator.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default IndicatorSelector;
