import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { InterestSelectionIndicatorTestIds } from './InterestSelectionIndicator.testIds';

interface InterestSelectionIndicatorProps {
  isSelected: boolean;
}

export const InterestSelectionIndicator = ({
  isSelected,
}: InterestSelectionIndicatorProps) => {
  const tw = useTailwind();

  if (isSelected) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={tw.style('h-[22px] w-[22px] rounded-full bg-icon-default')}
        testID={InterestSelectionIndicatorTestIds.CONTAINER}
      >
        <Icon
          name={IconName.CheckBold}
          size={IconSize.Sm}
          color={IconColor.PrimaryInverse}
        />
      </Box>
    );
  }

  return (
    <Icon
      testID={InterestSelectionIndicatorTestIds.CONTAINER}
      name={IconName.Add}
      size={IconSize.Lg}
      color={IconColor.IconDefault}
    />
  );
};
