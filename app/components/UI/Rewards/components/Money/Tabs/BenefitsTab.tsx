import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import {
  selectBenefits,
  selectBenefitsHasLoaded,
} from '../../../../../../reducers/rewards/selectors';
import { useBenefits } from '../../../hooks/useBenefits';
import useTrackRewardsPageView from '../../../hooks/useTrackRewardsPageView';
import BenefitCard from '../../Benefits/BenefitCard';
import BenefitEmptyList from '../../Benefits/BenefitEmptyList';
import TheMiracleFooter from '../../Benefits/TheMiracleFooter';
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
  useBenefits();
  useTrackRewardsPageView({ page_type: 'benefits' });

  const hasBenefits = benefits.length > 0;

  if (!hasBenefits) {
    // The tab remounts on every selection and re-reads on mount. Only the
    // first read shows skeletons, so a known-empty list does not flash them.
    return (
      <Box twClassName="gap-3 p-4" testID={BENEFITS_TAB_TEST_IDS.CONTAINER}>
        {hasLoaded ? (
          <BenefitEmptyList />
        ) : (
          SKELETON_ROWS.map((row) => (
            <Skeleton
              key={row}
              style={tw.style('h-28 rounded-lg')}
              testID={`${BENEFITS_TAB_TEST_IDS.SKELETON}-${row}`}
            />
          ))
        )}
      </Box>
    );
  }

  return (
    <Box twClassName="gap-3 px-4 pb-4" testID={BENEFITS_TAB_TEST_IDS.CONTAINER}>
      <Text
        variant={TextVariant.HeadingMd}
        twClassName="py-3"
        accessibilityRole="header"
      >
        {strings('rewards.benefits.list_header')}
      </Text>
      {benefits.map((benefit) => (
        <BenefitCard key={benefit.id} benefit={benefit} />
      ))}
      <TheMiracleFooter />
    </Box>
  );
};

export default BenefitsTab;
