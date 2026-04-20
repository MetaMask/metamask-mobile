import React from 'react';
import { useSeasonStatus } from './hooks/useSeasonStatus';
import { useGeoRewardsMetadata } from './hooks/useGeoRewardsMetadata';
import { useReferralDetails } from './hooks/useReferralDetails';
import { useMaybeShowCampaignEndToast } from './hooks/useMaybeShowCampaignEndToast';

/**
 * Side-effect subscriber for the Rewards stack: background data and campaign-end toast.
 * Renders nothing. Mount only under {@link RewardsNavigator} when the version guard allows
 * the normal stack (not alongside {@link RewardsUpdateRequired}), so these hooks do not
 * run while the update-required screen is shown.
 */
const RewardsSubscriber: React.FC = () => {
  useSeasonStatus({ onlyForExplicitFetch: false });
  useGeoRewardsMetadata({});
  useReferralDetails();
  useMaybeShowCampaignEndToast();

  return null;
};

export default RewardsSubscriber;
