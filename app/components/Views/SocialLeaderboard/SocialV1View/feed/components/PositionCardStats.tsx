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
import { EM_DASH } from '../../../utils/formatters';
import PositionCardDivider from './PositionCardDivider';
import { getSocialFeedPositionCardSectionDividerTestId } from './SocialFeedPositionCard.testIds';

export interface PositionCardStatRow {
  key: string;
  label: string;
  /** Missing values render an em dash rather than dropping the row. */
  value?: string;
  testID?: string;
  leadingValueAccessory?: React.ReactNode;
}

/**
 * `rows` stacks label/value pairs down the card, one per line -- it takes as
 * many stats as the position has. `columns` sits them side by side, which reads
 * faster but only fits a handful of short values.
 */
export type PositionCardStatsLayout = 'rows' | 'columns';

export interface PositionCardStatsProps {
  rows: PositionCardStatRow[];
  cardId: string;
  layout?: PositionCardStatsLayout;
}

const StatValue: React.FC<{
  row: PositionCardStatRow;
}> = ({ row }) => (
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
      numberOfLines={1}
      twClassName="shrink"
    >
      {row.value || EM_DASH}
    </Text>
  </Box>
);

const PositionCardStats: React.FC<PositionCardStatsProps> = ({
  rows,
  cardId,
  layout = 'rows',
}) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    // The shell's own gap sits above the divider; matching it below keeps the
    // rule optically centred between the header and the first stat row.
    <Box twClassName="gap-3">
      <PositionCardDivider
        testID={getSocialFeedPositionCardSectionDividerTestId(cardId)}
      />
      {layout === 'columns' ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={2}
        >
          {rows.map((row) => (
            // `flex-1 min-w-0` gives every column an equal share and lets a
            // long value truncate instead of pushing its neighbours off-card.
            <Box
              key={row.key}
              twClassName="flex-1 min-w-0 gap-1"
              testID={row.testID}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <StatValue row={row} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box twClassName="gap-2">
          {rows.map((row) => (
            <Box
              key={row.key}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              testID={row.testID}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {row.label}
              </Text>
              <StatValue row={row} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PositionCardStats;
