import React from 'react';
import { StatusTypes } from '@metamask/bridge-status-controller';
import { Box } from '../../../Box/Box';
import { useTheme } from '../../../../../util/theme';
import { StyleSheet } from 'react-native';

const getSegmentStyle = (type: StatusTypes | null) => 
  StyleSheet.create({
    dynamicStyles: {
      height: 6,
      width: 0,
      borderRadius: 9999,
      transition: 'width 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      ...(type === StatusTypes.PENDING && { width: '50%' }),
      ...(type === StatusTypes.COMPLETE && { width: '100%' }),
    },
  });

export default function Segment({ type }: { type: StatusTypes | null }) {
  const theme = useTheme();
  return (
    <Box
      backgroundColor={theme.colors.background.alternative}
    >
      <Box
        backgroundColor={theme.colors.primary.default}
        style={getSegmentStyle(type).dynamicStyles}
      />
    </Box>
  );
}
