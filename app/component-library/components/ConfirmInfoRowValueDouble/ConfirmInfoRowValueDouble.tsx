import React, { ReactNode } from 'react';
import { TextColor } from '../Texts/Text/Text.types';
import Text from '../Texts/Text';
import { Box } from '../../../components/UI/Box';
import { RowVariant } from '../../../components/Snaps/SnapUIRenderer/components/row';
import { AlignItems } from '../../../components/Snaps/SnapUIRenderer/components/box.types';
import { FlexDirection } from '../../../components/Snaps/SnapUIRenderer/components/box.types';

export type ConfirmInfoRowValueDoubleProps = {
  left: ReactNode;
  right: ReactNode;
  variant?: RowVariant;
};

const LEFT_TEXT_COLORS = {
  [RowVariant.Default]: TextColor.Muted,
  [RowVariant.Critical]: TextColor.ErrorAlternative,
  [RowVariant.Warning]: TextColor.Warning,
};

export const ConfirmInfoRowValueDouble = ({
  left,
  right,
  variant = RowVariant.Default,
}: ConfirmInfoRowValueDoubleProps) => {
  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={1}
    >
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
};
