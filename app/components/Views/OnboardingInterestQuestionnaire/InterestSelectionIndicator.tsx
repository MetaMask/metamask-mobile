import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface InterestSelectionIndicatorProps {
  isSelected: boolean;
}

export const InterestSelectionIndicator = ({
  isSelected,
}: InterestSelectionIndicatorProps) => {
  const tw = useTailwind();

  return (
    <View
      style={tw.style(
        'h-4 w-4 rounded-full',
        isSelected ? 'bg-icon-default' : 'border border-muted bg-transparent',
      )}
    />
  );
};
