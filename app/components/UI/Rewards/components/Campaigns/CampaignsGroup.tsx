import React from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import CampaignTile from './CampaignTile';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

interface CampaignsGroupProps {
  title: string;
  campaigns: CampaignDto[];
  testID?: string;
}

/**
 * Section component for displaying a group of campaigns with a title.
 * Campaign interactivity is determined by whether the campaign type is supported.
 */
const CampaignsGroup: React.FC<CampaignsGroupProps> = ({
  title,
  campaigns,
  testID,
}) => {
  if (campaigns.length === 0) {
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
    </Box>
  );
};

export default CampaignsGroup;
