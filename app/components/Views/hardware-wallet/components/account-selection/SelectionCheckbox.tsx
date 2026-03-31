import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

const SelectionCheckbox = ({
  isSelected,
  isDisabled,
}: {
  isSelected: boolean;
  isDisabled: boolean;
}) => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName={`h-6 w-6 rounded-md border ${isSelected ? 'border-muted bg-muted' : 'border-muted'} ${isDisabled ? 'opacity-70' : ''}`}
    >
      {isSelected ? <Icon name={IconName.Check} size={IconSize.Sm} /> : null}
    </Box>
  );
};

export default SelectionCheckbox;
