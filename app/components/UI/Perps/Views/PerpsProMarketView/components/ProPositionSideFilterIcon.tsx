import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';
import type { ProPositionSideFilter } from '../utils/proPositionSideFilter';

const styles = StyleSheet.create({
  bar: {
    height: 3,
    borderRadius: 1,
  },
});

interface ProPositionSideFilterIconProps {
  sideFilter: ProPositionSideFilter;
}

/**
 * Compact long/short/all-sides glyph for the positions side-filter sheet.
 */
const ProPositionSideFilterIcon = ({
  sideFilter,
}: ProPositionSideFilterIconProps) => {
  const { colors } = useTheme();
  const buyColor = colors.success.default;
  const sellColor = colors.error.default;
  const barColors: string[] =
    sideFilter === 'long'
      ? [buyColor, buyColor, buyColor]
      : sideFilter === 'short'
        ? [sellColor, sellColor, sellColor]
        : [buyColor, buyColor, sellColor, sellColor];
  const barWidths = sideFilter === 'all' ? [18, 14, 14, 10] : [18, 14, 10];

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-0.5">
      {barWidths.map((width, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={`${sideFilter}-${index}`}
          style={[
            styles.bar,
            {
              width,
              backgroundColor: barColors[index],
            },
          ]}
        />
      ))}
    </Box>
  );
};

export default ProPositionSideFilterIcon;
