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

import BoxGlass from '../../../../component-library/components-temp/BoxGlass';

interface IndicatorBarProps {
  /** Label for the MA button (e.g. "MA", "MA5", "MA x2"). */
  maLabel?: string;
  /** Called when the MA dropdown is pressed. */
  onMAPress?: () => void;
  /** Set of currently active indicator names (e.g. "MACD", "RSI"). */
  activeIndicators?: Set<string>;
  /** Called when an indicator toggle button is pressed. */
  onIndicatorToggle?: (name: string) => void;
  /** Draws the bar as a brand refresh glass pill. */
  isGlass?: boolean;
}

const TOGGLE_INDICATORS: { name: string; showDividerAfter?: boolean }[] = [
  { name: 'BOL', showDividerAfter: true },
  { name: 'RSI' },
  { name: 'Volume' },
  { name: 'MACD' },
];

const IndicatorBar: React.FC<IndicatorBarProps> = ({
  maLabel = 'MA',
  onMAPress,
  activeIndicators,
  onIndicatorToggle,
  isGlass = false,
}) => {
  const tw = useTailwind();

  const isActive = (name: string) => activeIndicators?.has(name) ?? false;

  const items = (
    <>
      {/* MA dropdown */}
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'flex-row items-center gap-0.5 pr-3',
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

      {TOGGLE_INDICATORS.map(({ name, showDividerAfter }) => {
        const active = isActive(name);
        return (
          <React.Fragment key={name}>
            <Pressable
              style={({ pressed }) => tw.style('px-3', pressed && 'opacity-70')}
              onPress={() => onIndicatorToggle?.(name)}
              accessibilityRole="button"
              accessibilityLabel={name}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={active ? FontWeight.Bold : FontWeight.Medium}
                twClassName={
                  active ? 'text-text-default' : 'text-text-alternative'
                }
              >
                {name}
              </Text>
            </Pressable>
            {showDividerAfter ? (
              <Box twClassName="h-4 w-px bg-border-muted" />
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );

  if (isGlass) {
    return (
      <BoxGlass
        radiusClassName="rounded-full"
        containerStyle={tw.style('mx-4')}
        style={tw.style('flex-row items-center px-4 py-2')}
      >
        {items}
      </BoxGlass>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full border-t border-b border-border-muted px-4 py-2"
    >
      {items}
    </Box>
  );
};

export default IndicatorBar;
