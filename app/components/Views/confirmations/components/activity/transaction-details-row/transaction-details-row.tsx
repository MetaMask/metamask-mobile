import React from 'react';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../../UI/Box/box.types';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

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
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
      {children}
    </Box>
  );
}
