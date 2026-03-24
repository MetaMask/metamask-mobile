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
import { Image, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes.ts';

const BenefitsSummary = () => {
  const tw = useTailwind();
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
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-default"
      >
        {strings('rewards.benefits.title')}
      </Text>
      <TouchableOpacity
        onPress={() =>
          NavigationService.navigation.navigate(Routes.BENEFIT_LIST_VIEW)
        }
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <Text>view all</Text>
      </TouchableOpacity>
      <Box
        twClassName={`bg-section rounded-lg p-4 flex-col gap-3`}
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
      >
        {isLoading ? (
          <Skeleton height={'100%'} width="100%" />
        ) : (
          <Box twClassName="flex-row items-start gap-4">
            <Image
              source={{ uri: firstBenefit.thumbnail }}
              style={tw.style('w-[106px] h-[106px] rounded-lg')}
              resizeMode="cover"
              testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
            />
            <Box twClassName="flex-1">
              <Text variant={TextVariant.HeadingSm} twClassName="text-default">
                {firstBenefit.longTitle}
              </Text>
              <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
                {firstBenefit.shortDescription}
              </Text>
            </Box>
            <Box></Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BenefitsSummary;
