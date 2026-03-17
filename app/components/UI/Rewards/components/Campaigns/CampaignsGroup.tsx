import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import CampaignTile from './CampaignTile';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import PreviousSeasonTile from '../PreviousSeason/PreviousSeasonTile';
import { selectSeasonName } from '../../../../../reducers/rewards/selectors';
import { useSelector } from 'react-redux';

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
  if (campaigns.length === 0 && !displayPreviousSeason) {
    return null;
  }

  if (displayPreviousSeason && !seasonName) {
    return null;
  }

  return (
    <Box twClassName="gap-3" testID={testID}>
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {title}
      </Text>
      {campaigns.map((campaign) => (
        <CampaignTile key={campaign.id} campaign={campaign} />
      ))}
      {displayPreviousSeason && <PreviousSeasonTile />}
    </Box>
  );
};

export default CampaignsGroup;
