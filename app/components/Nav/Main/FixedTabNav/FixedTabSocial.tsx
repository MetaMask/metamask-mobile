import React from 'react';
import { useSelector } from 'react-redux';
import { SocialV0View, SocialV1View } from '../../../Views/SocialLeaderboard';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';

/**
 * The Social footer tab. Same screen the product tab uses: V1 when that
 * experience is on, otherwise the leaderboard.
 */
const FixedTabSocial = () => {
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);
  return isSocialV1Enabled ? <SocialV1View /> : <SocialV0View />;
};

export default FixedTabSocial;
