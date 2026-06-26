import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export function RampActivityDetailsRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {children}
    </Box>
  );
}
