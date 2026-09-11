import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

export interface PositionCardStatRow {
  key: string;
  label: string;
  value?: string;
  testID?: string;
  leadingValueAccessory?: React.ReactNode;
}

export interface PositionCardStatsProps {
  rows: PositionCardStatRow[];
}

const PositionCardStats: React.FC<PositionCardStatsProps> = ({ rows }) => {
  const visibleRows = rows.filter((row) => Boolean(row.value));

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <Box twClassName="gap-2">
      {visibleRows.map((row) => (
        <Box
          key={row.key}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          testID={row.testID}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {row.label}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            {row.leadingValueAccessory}
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {row.value}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PositionCardStats;
