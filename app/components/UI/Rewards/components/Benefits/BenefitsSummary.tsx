import {
  Box,
  FontWeight,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useEffect } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { useSelector } from 'react-redux';
import {
  selectBenefitsLoading,
  selectFirstBenefit,
} from '../../../../../reducers/benefits/selectors.ts';
import { useBenefits } from '../../hooks/useBenefits.ts';
import BenefitCard from './BenefitCard.tsx';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes.ts';

const BenefitsSummary = () => {
  const firstBenefit = useSelector(selectFirstBenefit);
  const isLoading = useSelector(selectBenefitsLoading);
  const { initBenefits } = useBenefits();

  useEffect(() => {
    initBenefits().then();
  }, [initBenefits]);

  if (!firstBenefit) {
    return null;
  }

  return (
    <Box
      twClassName="gap-4 px-4"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      <Box twClassName="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() =>
            NavigationService.navigation.navigate(Routes.BENEFIT_LIST_VIEW, {
              benefit,
            })
          }
          activeOpacity={0.7}
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-default"
          >
            {strings('rewards.benefits.title')}
          </Text>
        </TouchableOpacity>
      </Box>

      <Box
        twClassName={`bg-section rounded-lg flex-col gap-3`}
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
      >
        {isLoading ? (
          <Skeleton height={'132px'} width="100%" />
        ) : (
          <BenefitCard benefit={firstBenefit} />
        )}
      </Box>
    </Box>
  );
};

export default BenefitsSummary;
