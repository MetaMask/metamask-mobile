import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PendingTag } from './OndoCampaignStatsSummary';

export interface CampaignLeaderboardStatsHeaderTestIds {
  CONTAINER: string;
  RANK_VALUE: string;
  SUBTEXT_VALUE: string;
  COMPUTED_AT: string;
  PENDING_TAG: string;
  QUALIFIED_ICON: string;
}

interface CampaignLeaderboardStatsHeaderProps {
  title: string;
  rank: number | null;
  isEligible: boolean | null;
  isLoading?: boolean;
  subtextValue?: string;
  subtextColor?: TextColor;
  computedAtLabel?: string;
  showSubtext?: boolean;
  showComputedAt?: boolean;
  isCampaignComplete?: boolean;
  emptyRankValue?: string;
  testIDs: CampaignLeaderboardStatsHeaderTestIds;
}

const CampaignLeaderboardStatsHeader: React.FC<
  CampaignLeaderboardStatsHeaderProps
> = ({
  title,
  rank,
  isEligible,
  isLoading = false,
  subtextValue = '—',
  subtextColor = TextColor.TextDefault,
  computedAtLabel = '',
  showSubtext = true,
  showComputedAt = true,
  isCampaignComplete = false,
  emptyRankValue = '—',
  testIDs,
}) => {
  const tw = useTailwind();
  const isPending = isEligible === false;
  const isQualified = isEligible === true;
  const rankValue =
    rank != null && Number.isFinite(rank)
      ? String(rank).padStart(2, '0')
      : emptyRankValue;

  const showSubtextRow = showSubtext || showComputedAt;

  return (
    <Box twClassName="gap-4" testID={testIDs.CONTAINER}>
      <Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.HeadingMd}>{title}</Text>
          {isPending && !isCampaignComplete && (
            <PendingTag testID={testIDs.PENDING_TAG} />
          )}
          {isQualified && (
            <Icon
              name={IconName.Check}
              size={IconSize.Sm}
              color={IconColor.SuccessDefault}
              testID={testIDs.QUALIFIED_ICON}
            />
          )}
        </Box>

        {isLoading ? (
          <Box twClassName="gap-2 mt-2 mb-1">
            <Skeleton style={tw.style('h-9 w-28 rounded')} />
            {showSubtextRow && (
              <Skeleton style={tw.style('h-4 w-full max-w-xs rounded')} />
            )}
          </Box>
        ) : (
          <>
            <Text
              variant={TextVariant.DisplayLg}
              fontWeight={FontWeight.Bold}
              testID={testIDs.RANK_VALUE}
            >
              {rankValue}
            </Text>
            {showSubtextRow && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="w-full"
              >
                <Box twClassName="min-w-0 flex-1">
                  {showSubtext && (
                    <Text
                      variant={TextVariant.BodySm}
                      color={subtextColor}
                      fontWeight={FontWeight.Medium}
                      testID={testIDs.SUBTEXT_VALUE}
                    >
                      {subtextValue}
                    </Text>
                  )}
                </Box>
                {showComputedAt && computedAtLabel.length > 0 && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                    testID={testIDs.COMPUTED_AT}
                  >
                    {computedAtLabel}
                  </Text>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default CampaignLeaderboardStatsHeader;
