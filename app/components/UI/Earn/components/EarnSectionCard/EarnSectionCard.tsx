import React, { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface EarnSectionCardProps {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
}

/**
 * Shared surface and interaction behavior for Earn section carousel cards.
 */
const EarnSectionCard = ({
  children,
  onPress,
  testID,
}: EarnSectionCardProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'h-[174px] w-[160px] flex-col justify-between rounded-xl bg-muted p-4',
          pressed && 'opacity-70',
        )
      }
    >
      {children}
    </Pressable>
  );
};

export default EarnSectionCard;
