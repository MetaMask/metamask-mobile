import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import type {
  IndicatorToggleProps,
  IndicatorType,
} from './AdvancedChart.types';
import type { Theme } from '../../../../util/theme/models';

const INDICATORS: { type: IndicatorType; label: string }[] = [
  { type: 'MACD', label: 'MACD' },
  { type: 'RSI', label: 'RSI' },
  { type: 'MA200', label: 'MA(200)' },
];

const createStyles = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      color: params.theme.colors.text.muted,
      marginRight: 4,
    },
    button: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: params.theme.colors.border.muted,
      backgroundColor: params.theme.colors.background.default,
    },
    buttonActive: {
      backgroundColor: params.theme.colors.primary.muted,
      borderColor: params.theme.colors.primary.default,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      color: params.theme.colors.text.alternative,
    },
    buttonTextActive: {
      color: params.theme.colors.primary.default,
    },
  });

const IndicatorToggle: React.FC<IndicatorToggleProps> = ({
  activeIndicators,
  onToggle,
  disabled = false,
}) => {
  const { styles } = useStyles(createStyles, {});

  const handlePress = useCallback(
    (indicator: IndicatorType) => {
      if (disabled) return;
      onToggle(indicator);
    },
    [disabled, onToggle],
  );

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodySm} style={styles.label}>
        Indicators:
      </Text>
      {INDICATORS.map(({ type, label }) => {
        const isActive = activeIndicators.includes(type);
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              disabled && styles.buttonDisabled,
            ]}
            onPress={() => handlePress(type)}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={`${label} indicator ${isActive ? 'enabled' : 'disabled'}`}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={isActive ? FontWeight.Medium : FontWeight.Regular}
              style={[styles.buttonText, isActive && styles.buttonTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default IndicatorToggle;
