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
  selectBenefits,
  selectBenefitsLoading,
  selectFirstBenefit,
} from '../../../../../reducers/benefits/selectors.ts';
import { useBenefits } from '../../hooks/useBenefits.ts';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const BenefitsSummary = () => {
  const tw = useTailwind();
  const firstBenefit = useSelector(selectFirstBenefit);
  const isLoading = useSelector(selectBenefitsLoading);
  const { fetchBenefits } = useBenefits();

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  if (!firstBenefit) {
    return null;
  }

  return (
    <Box
      twClassName="gap-4 px-4"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-default"
      >
        {strings('rewards.benefits.title')}
      </Text>

      <Box
        twClassName={`bg-section rounded-lg p-4 flex-col gap-3`}
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
      >
        {isLoading ? (
          <Skeleton height={'100%'} width="100%" />
        ) : (
          <Box twClassName="flex-row items-start gap-4">
            {/* Text on the left */}
            <Box twClassName="flex-1">
              <Text variant={TextVariant.HeadingSm} twClassName="text-default">
                {firstBenefit.longTitle}
              </Text>
              <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
                {firstBenefit.shortDescription}
              </Text>
            </Box>
            <Box>
              <Image
                source={{ uri: firstBenefit.thumbnail }}
                style={tw.style('w-[106px] h-[106px]')}
                resizeMode="contain"
                testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BenefitsSummary;
