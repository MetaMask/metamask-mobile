import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import {
  selectBenefits,
  selectBenefitsError,
  selectBenefitsHasLoaded,
  selectBenefitsLoading,
} from '../../../../../../reducers/rewards/selectors';
import { useBenefits } from '../../../hooks/useBenefits';
import useTrackRewardsPageView from '../../../hooks/useTrackRewardsPageView';
import BenefitCard from '../../Benefits/BenefitCard';
import BenefitEmptyList from '../../Benefits/BenefitEmptyList';
import TheMiracleFooter from '../../Benefits/TheMiracleFooter';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { BENEFITS_TAB_TEST_IDS } from './BenefitsTab.testIds';

const SKELETON_ROWS = [0, 1, 2];

/**
 * Benefits tab of the Rewards dashboard: the same rows as the Benefits
 * screen. Rendered only for an opted-in user.
 *
 * The dashboard owns the scroller, so the rows are not virtualized here. The
 * Benefits screen keeps its FlatList.
 */
const BenefitsTab: React.FC = () => {
  const tw = useTailwind();
  const benefits = useSelector(selectBenefits);
  const hasLoaded = useSelector(selectBenefitsHasLoaded);
  const hasError = useSelector(selectBenefitsError);
  const isLoading = useSelector(selectBenefitsLoading);
  const { getAllBenefits } = useBenefits();
  useTrackRewardsPageView({ page_type: 'benefits' });

  const hasBenefits = benefits.length > 0;

  if (!hasBenefits) {
    // The tab remounts on every selection and re-reads on mount. Only the
    // first read shows skeletons, so a known-empty list does not flash them.
    let body: React.ReactNode;
    if (hasError) {
      // A failed read leaves the list empty. Say so rather than claim the
      // user has no benefits; this scroller has no pull-to-refresh. The error
      // stays stored until a read succeeds, so the banner holds through a
      // retry and through the re-read on the next visit to this tab.
      body = (
        <RewardsErrorBanner
          title={strings('rewards.benefits.error_title')}
          description={strings('rewards.benefits.error_description')}
          onConfirm={() => {
            void getAllBenefits();
          }}
          onConfirmLoading={isLoading}
          confirmButtonLabel={strings('rewards.benefits.retry_button')}
          testID={BENEFITS_TAB_TEST_IDS.ERROR}
        />
      );
    } else if (hasLoaded) {
      body = <BenefitEmptyList />;
    } else {
      body = SKELETON_ROWS.map((row) => (
        <Skeleton
          key={row}
          style={tw.style('h-28 rounded-lg')}
          testID={`${BENEFITS_TAB_TEST_IDS.SKELETON}-${row}`}
        />
      ));
    }

    return (
      <Box twClassName="gap-3 p-4" testID={BENEFITS_TAB_TEST_IDS.CONTAINER}>
        {body}
      </Box>
    );
  }

  return (
    <Box twClassName="gap-3 p-4" testID={BENEFITS_TAB_TEST_IDS.CONTAINER}>
      {benefits.map((benefit) => (
        <BenefitCard key={benefit.id} benefit={benefit} />
      ))}
      <TheMiracleFooter />
    </Box>
  );
};

export default BenefitsTab;
