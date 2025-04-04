import React, { ReactNode } from 'react';
import { TextColor } from '../../../components/Texts/Text/Text.types';
import Text from '../../../components/Texts/Text';
import { Box } from '../../../../components/UI/Box/Box';
import { RowVariant } from '../../../../components/Snaps/SnapUIRenderer/components/row';
import {
  FlexDirection,
  AlignItems,
} from '../../../../components/UI/Box/box.types';

export interface ConfirmInfoRowValueDoubleProps {
  left: ReactNode;
  right: ReactNode;
  variant?: RowVariant;
}

const LEFT_TEXT_COLORS = {
  [RowVariant.Default]: TextColor.Muted,
  [RowVariant.Critical]: TextColor.ErrorAlternative,
  [RowVariant.Warning]: TextColor.Warning,
};

export const ConfirmInfoRowValueDouble = ({
  left,
  right,
  variant = RowVariant.Default,
}: ConfirmInfoRowValueDoubleProps) => (
  <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={4}>
    {typeof left === 'string' ? (
      <Text color={LEFT_TEXT_COLORS[variant] as TextColor}>{left}</Text>
    ) : (
      left
    )}
    {typeof right === 'string' ? (
      <Text color={TextColor.Default}>{right}</Text>
    ) : (
      right
    )}
  </Box>
);
