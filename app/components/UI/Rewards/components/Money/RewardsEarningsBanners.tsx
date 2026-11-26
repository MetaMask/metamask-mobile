import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type {
  EarningsSummaryDto,
  ReferralLocalizedText,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  taxHeldBaseUnits,
  underReviewBlockedBaseUnits,
  type SummaryFamilyScope,
} from '../../utils/earningsSummaryTotals';
import RewardsHeldBanner from './RewardsHeldBanner';
import RewardsPausedBanner from './RewardsPausedBanner';

/**
 * The balance notices above an earnings history: rewards paused for review,
 * then rewards held until a tax determination clears. Each shows only when
 * its amount is positive, and nothing renders when neither is. Pass a `scope`
 * on a family page so the amounts are that family's, and no summary while it
 * is still loading.
 */
const RewardsEarningsBanners: React.FC<{
  summary: EarningsSummaryDto | null | undefined;
  localizedText: ReferralLocalizedText;
  scope?: SummaryFamilyScope;
  /** Spacing around the banners. It applies only while one of them shows. */
  twClassName?: string;
}> = ({ summary, localizedText, scope, twClassName }) => {
  const pausedBaseUnits = underReviewBlockedBaseUnits(summary, scope);
  const heldUnits = taxHeldBaseUnits(summary, scope);
  if (!pausedBaseUnits && !heldUnits) {
    return null;
  }

  return (
    <Box className={twClassName ? `gap-2 ${twClassName}` : 'gap-2'}>
      {pausedBaseUnits ? (
        <RewardsPausedBanner
          baseUnits={pausedBaseUnits}
          localizedText={localizedText}
        />
      ) : null}
      {heldUnits ? (
        <RewardsHeldBanner
          baseUnits={heldUnits}
          localizedText={localizedText}
        />
      ) : null}
    </Box>
  );
};

export default RewardsEarningsBanners;
