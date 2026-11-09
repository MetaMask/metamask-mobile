import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PerpDirection } from '../../../../UI/SocialFeed/utils/perp';
import PositionCardShell, {
  type PositionCardTone,
} from '../../../../UI/SocialFeed/components/PositionCardShell';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';

export interface PositionSheetTradeSummaryProps {
  title: string;
  /** `40x Long` / `40x Short`. Spot cards have no tag. */
  tagLabel?: string;
  direction?: PerpDirection | null;
  subtitle: string;
  pnlPercentLabel: string;
  pnlValueLabel: string;
  isPnlPositive: boolean;
}

const tagSeverity = (direction: PerpDirection | null | undefined) => {
  if (direction === 'long') return TagSeverity.Success;
  if (direction === 'short') return TagSeverity.Danger;
  return TagSeverity.Neutral;
};

const pnlClassName = (isPnlPositive: boolean) =>
  isPnlPositive ? 'text-success-default' : 'text-error-default';

/**
 * The position under the chart. Same type, tag, and wash as the feed card
 * header, without the token avatar. The card radius comes from
 * `PositionCardShell` (`rounded-2xl`, 16px).
 */
const PositionSheetTradeSummary = ({
  title,
  tagLabel,
  direction,
  subtitle,
  pnlPercentLabel,
  pnlValueLabel,
  isPnlPositive,
}: PositionSheetTradeSummaryProps) => {
  const tone: PositionCardTone = isPnlPositive ? 'positive' : 'negative';

  return (
    <PositionCardShell tone={tone}>
      <Box
        testID={PositionDetailsSheetSelectorsIDs.TRADE_SUMMARY}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Box twClassName="flex-1 min-w-0">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="shrink"
            >
              {title}
            </Text>
            {tagLabel ? (
              <Box alignItems={BoxAlignItems.Center}>
                <Tag severity={tagSeverity(direction)}>{tagLabel}</Tag>
              </Box>
            ) : null}
          </Box>
          {subtitle ? (
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </Box>
        <Box
          alignItems={BoxAlignItems.End}
          twClassName="shrink-0 max-w-[45%] min-w-0"
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {pnlValueLabel}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            twClassName={pnlClassName(isPnlPositive)}
            numberOfLines={1}
          >
            {pnlPercentLabel}
          </Text>
        </Box>
      </Box>
    </PositionCardShell>
  );
};

export default PositionSheetTradeSummary;
