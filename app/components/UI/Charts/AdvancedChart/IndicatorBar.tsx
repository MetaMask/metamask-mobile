import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

interface IndicatorBarProps {
  /** Current interval label to display (e.g. "15M", "1H", "1D"). */
  intervalLabel: string;
  /** Called when the interval dropdown is pressed. */
  onIntervalPress?: () => void;
  /** Label for the MA button (e.g. "MA", "MA5", "MA x2"). */
  maLabel?: string;
  /** Called when the MA dropdown is pressed. */
  onMAPress?: () => void;
  /** Set of currently active indicator names (e.g. "MACD", "RSI"). */
  activeIndicators?: Set<string>;
  /** Called when an indicator toggle button is pressed. */
  onIndicatorToggle?: (name: string) => void;
}

const IndicatorBar: React.FC<IndicatorBarProps> = ({
  intervalLabel,
  onIntervalPress,
  maLabel = 'MA',
  onMAPress,
  activeIndicators,
  onIndicatorToggle,
}) => {
  const tw = useTailwind();

  const isActive = (name: string) => activeIndicators?.has(name) ?? false;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full border-t border-b border-border-muted px-4 py-2"
    >
      {/* Interval dropdown */}
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'flex-row items-center gap-0.5 pr-3',
            pressed && 'opacity-70',
          )
        }
        onPress={onIntervalPress}
        accessibilityRole="button"
        accessibilityLabel={`Interval ${intervalLabel}`}
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative"
        >
          {intervalLabel}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          twClassName="text-icon-alternative"
        />
      </Pressable>

      {/* Divider between interval and MA */}
      <Box twClassName="h-4 w-px bg-border-muted" />

      {/* MA dropdown */}
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'flex-row items-center gap-0.5 px-3',
            pressed && 'opacity-70',
          )
        }
        onPress={onMAPress}
        accessibilityRole="button"
        accessibilityLabel="MA"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative"
        >
          {maLabel}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Xs}
          twClassName="text-icon-alternative"
        />
      </Pressable>

      {/* BOL (Bollinger Bands) */}
      <Pressable
        style={({ pressed }) => tw.style('px-3', pressed && 'opacity-70')}
        onPress={() => onIndicatorToggle?.('BOL')}
        accessibilityRole="button"
        accessibilityLabel="BOL"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={isActive('BOL') ? FontWeight.Bold : FontWeight.Medium}
          twClassName={
            isActive('BOL') ? 'text-text-default' : 'text-text-alternative'
          }
        >
          BOL
        </Text>
      </Pressable>

      {/* Divider between BOL and RSI */}
      <Box twClassName="h-4 w-px bg-border-muted" />

      {/* RSI */}
      <Pressable
        style={({ pressed }) => tw.style('px-3', pressed && 'opacity-70')}
        onPress={() => onIndicatorToggle?.('RSI')}
        accessibilityRole="button"
        accessibilityLabel="RSI"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={isActive('RSI') ? FontWeight.Bold : FontWeight.Medium}
          twClassName={
            isActive('RSI') ? 'text-text-default' : 'text-text-alternative'
          }
        >
          RSI
        </Text>
      </Pressable>

      {/* Volume */}
      <Pressable
        style={({ pressed }) => tw.style('px-3', pressed && 'opacity-70')}
        onPress={() => onIndicatorToggle?.('Volume')}
        accessibilityRole="button"
        accessibilityLabel="Volume"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={isActive('Volume') ? FontWeight.Bold : FontWeight.Medium}
          twClassName={
            isActive('Volume') ? 'text-text-default' : 'text-text-alternative'
          }
        >
          Volume
        </Text>
      </Pressable>

      {/* MACD */}
      <Pressable
        style={({ pressed }) => tw.style('px-3', pressed && 'opacity-70')}
        onPress={() => onIndicatorToggle?.('MACD')}
        accessibilityRole="button"
        accessibilityLabel="MACD"
      >
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={isActive('MACD') ? FontWeight.Bold : FontWeight.Medium}
          twClassName={
            isActive('MACD') ? 'text-text-default' : 'text-text-alternative'
          }
        >
          MACD
        </Text>
      </Pressable>
    </Box>
  );
};

export default IndicatorBar;
