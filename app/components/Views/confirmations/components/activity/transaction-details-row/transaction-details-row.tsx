import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

export interface TransactionDetailsRowProps {
  children: React.ReactNode;
  label: string;
}

export function TransactionDetailsRow({
  children,
  label,
}: TransactionDetailsRowProps) {
  return (
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
    >
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {label}
      </Text>
      {children}
    </Box>
  );
}
