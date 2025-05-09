import React from 'react';
import { StatusTypes } from '@metamask/bridge-controller';
import { Box } from '../../../Box/Box';
import { useTheme } from '../../../../../util/theme';
import { StyleSheet } from 'react-native';

const getSegmentStyle = (type: StatusTypes | null) =>
  StyleSheet.create({
    outerSegment: {
      height: 4,
      width: '35%',
    },
    innerSegment: {
      height: 4,
      width: 0,
      borderRadius: 9999,
      transition: 'width 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      ...(type === StatusTypes.PENDING && { width: '50%' }),
      ...(type === StatusTypes.COMPLETE && { width: '100%' }),
    },
  });

export default function Segment({ type }: { type: StatusTypes | null }) {
  const theme = useTheme();
  const styles = getSegmentStyle(type);
  return (
    <Box
      backgroundColor={theme.colors.background.alternative}
      style={styles.outerSegment}
    >
      <Box
        backgroundColor={theme.colors.primary.default}
        style={styles.innerSegment}
      />
    </Box>
  );
}
