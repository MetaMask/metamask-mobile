import React, { ReactNode } from 'react';
import { AlignItems } from '../../../components/Approvals/Snaps/SnapUIRenderer/utils';
import { FlexDirection } from '../../../components/Approvals/Snaps/SnapUIRenderer/utils';
import { TextColor } from '../Texts/Text/Text.types';
import { Color } from '../../../components/Approvals/Snaps/SnapUIRenderer/utils';
import Text from '../Texts/Text';
import { Box } from '../../../components/UI/Box';
import { RowVariant } from '../../../components/Approvals/Snaps/SnapUIRenderer/components/row';

export type ConfirmInfoRowValueDoubleProps = {
  left: ReactNode;
  right: ReactNode;
  variant?: RowVariant;
};

const LEFT_TEXT_COLORS = {
  [RowVariant.Default]: TextColor.Muted,
  [RowVariant.Critical]: Color.errorAlternative,
  [RowVariant.Warning]: Color.warningDefault,
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
