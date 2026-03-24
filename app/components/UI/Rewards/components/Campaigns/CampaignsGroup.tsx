import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import CampaignTile from './CampaignTile';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import PreviousSeasonTile from '../PreviousSeason/PreviousSeasonTile';
import { selectSeasonName } from '../../../../../reducers/rewards/selectors';
import { selectCampaignsRewardsEnabledFlag } from '../../../../../selectors/featureFlagController/rewards';

interface CampaignsGroupProps {
  title: string;
  campaigns: CampaignDto[];
  testID?: string;
  displayPreviousSeason?: boolean;
}

/**
 * Section component for displaying a group of campaigns with a title.
 */
const CampaignsGroup: React.FC<CampaignsGroupProps> = ({
  title,
  campaigns,
  testID,
  displayPreviousSeason = false,
}) => {
  const seasonName = useSelector(selectSeasonName);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const showPreviousSeason = displayPreviousSeason && !!seasonName;

  if (campaigns.length === 0 && !showPreviousSeason) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={testID}>
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {title}
      </Text>
      {campaigns.map((campaign) => (
        <CampaignTile
          key={campaign.id}
          campaign={campaign}
          isInteractive={isCampaignsEnabled}
        />
      ))}
      {showPreviousSeason && <PreviousSeasonTile />}
    </Box>
  );
};

export default CampaignsGroup;
