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
import { POSITION_CARD_BLEED_TW_CLASS } from './PositionCardShell';
import { getSocialFeedPositionCardSectionDividerTestId } from './SocialFeedPositionCard.testIds';

export interface PositionCardStatRow {
  key: string;
  label: string;
  /** Missing values render an em dash rather than dropping the row. */
  value?: string;
  testID?: string;
  leadingValueAccessory?: React.ReactNode;
}

export interface PositionCardStatsProps {
  rows: PositionCardStatRow[];
  cardId: string;
}

const PositionCardStats: React.FC<PositionCardStatsProps> = ({
  rows,
  cardId,
}) => {
  if (rows.length === 0) {
    return null;
  }

  return (
    // The shell's own gap sits above the divider; matching it below keeps the
    // rule optically centred between the header and the first stat row.
    <Box twClassName="gap-3">
      <Box
        twClassName={`${POSITION_CARD_BLEED_TW_CLASS} h-px bg-border-muted`}
        testID={getSocialFeedPositionCardSectionDividerTestId(cardId)}
      />
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
                {row.value || EM_DASH}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PositionCardStats;
