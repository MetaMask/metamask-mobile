import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { SwapsLimitOrderCostToleranceModalSelectorsIDs } from './testIds';
import type { CostToleranceOption } from './types';

interface Props {
  options: CostToleranceOption[];
}

export const CostToleranceButtonGroup = ({ options }: Props) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Center}
    padding={4}
    gap={2}
    testID={SwapsLimitOrderCostToleranceModalSelectorsIDs.BUTTON_GROUP}
  >
    {options.map((option) => (
      <Box key={option.id}>
        <Button
          variant={
            option.selected ? ButtonVariant.Primary : ButtonVariant.Secondary
          }
          size={ButtonSize.Lg}
          onPress={option.onPress}
          testID={SwapsLimitOrderCostToleranceModalSelectorsIDs.OPTION(
            option.id,
          )}
        >
          {option.label}
        </Button>
      </Box>
    ))}
  </Box>
);
