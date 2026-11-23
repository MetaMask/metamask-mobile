import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import useTrackRewardsPageView from '../../../hooks/useTrackRewardsPageView';
import CampaignsList from '../../Campaigns/CampaignsList';
import { CAMPAIGNS_TAB_TEST_IDS } from './CampaignsTab.testIds';

/**
 * Campaigns tab of the Rewards dashboard: the same list as the Campaigns
 * screen, scrolled by the dashboard. Rendered only for an opted-in user.
 */
const CampaignsTab: React.FC = () => {
  useTrackRewardsPageView({ page_type: 'campaigns_overview' });

  return (
    <Box twClassName="p-4" testID={CAMPAIGNS_TAB_TEST_IDS.CONTAINER}>
      <CampaignsList />
    </Box>
  );
};

export default CampaignsTab;
