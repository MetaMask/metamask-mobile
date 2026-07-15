import { useMemo } from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import type {
  CampaignDto,
  CampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { formatTierDisplayName } from '../components/Campaigns/OndoLeaderboard.utils';
import {
  formatPercentChange,
  getPortfolioReturnColor,
} from '../utils/formatUtils';
import { isCampaignIneligible } from '../utils/ondoCampaignConstants';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

interface UseOndoLeaderboardPositionDisplayParams {
  campaign: CampaignDto | null;
  position: CampaignLeaderboardPositionDto | null;
  portfolioPnlPercent?: string;
}

interface UseOndoLeaderboardPositionDisplayResult {
  isCampaignComplete: boolean;
  isPending: boolean;
  isQualified: boolean;
  isIneligible: boolean;
  rankValue: string;
  tierValue: string;
  returnValue: string | undefined;
  returnColor: TextColor;
}

export const useOndoLeaderboardPositionDisplay = ({
  campaign,
  position,
  portfolioPnlPercent,
}: UseOndoLeaderboardPositionDisplayParams): UseOndoLeaderboardPositionDisplayResult => {
  const isCampaignComplete =
    campaign != null && getCampaignStatus(campaign) === 'complete';
  const isPending = position != null && !position.qualified;
  const isQualified = position != null && position.qualified;
  const isIneligible = useMemo(
    () => isCampaignIneligible(campaign, position?.qualified),
    [campaign, position],
  );
  const rankValue =
    isIneligible || !position ? '-' : String(position.rank).padStart(2, '0');
  const tierValue =
    isIneligible || !position
      ? '-'
      : formatTierDisplayName(position.projectedTier);
  const returnValue = portfolioPnlPercent
    ? formatPercentChange(portfolioPnlPercent)
    : undefined;
  const returnColor = getPortfolioReturnColor(portfolioPnlPercent);
  return {
    isCampaignComplete,
    isPending,
    isQualified,
    isIneligible,
    rankValue,
    tierValue,
    returnValue,
    returnColor,
  };
};
