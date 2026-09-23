import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { hasPrizePoolContent } from '../../utils/prizePoolUtils';
import CampaignPrizePool, {
  type CampaignPrizePoolSchedule,
} from './CampaignPrizePool';

export const CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS = {
  CONTAINER: 'campaign-prize-pool-section',
  HEADING: 'campaign-prize-pool-section-heading',
} as const;

interface CampaignPrizePoolSectionProps {
  prizePool: CampaignPrizePoolSchedule | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
}

/**
 * A campaign's whole prize pool section: the divider and heading chrome, the
 * ladder itself, and the decision about whether any of it appears.
 *
 * The heading has to share that decision. When there is no data and nothing in
 * flight the ladder renders nothing, and a lone "Prize pool" title above empty
 * space reads worse than no section at all — so a campaign cannot show one
 * without the other.
 */
const CampaignPrizePoolSection: React.FC<CampaignPrizePoolSectionProps> = ({
  prizePool,
  isLoading,
  hasError,
  refetch,
}) => {
  if (
    !hasPrizePoolContent({ hasData: prizePool != null, isLoading, hasError })
  ) {
    return null;
  }

  return (
    <>
      <Box twClassName="my-1 border-b border-border-muted" />
      <Box
        twClassName="p-4"
        testID={CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.CONTAINER}
      >
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="mb-1"
          testID={CAMPAIGN_PRIZE_POOL_SECTION_TEST_IDS.HEADING}
        >
          {strings('rewards.campaign_prize_pool.title')}
        </Text>
        <CampaignPrizePool
          prizePool={prizePool}
          isLoading={isLoading}
          hasError={hasError}
          refetch={refetch}
        />
      </Box>
    </>
  );
};

export default CampaignPrizePoolSection;
