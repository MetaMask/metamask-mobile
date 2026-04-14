import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { useSelector } from 'react-redux';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../../reducers/rewards/selectors.ts';
import { useBenefits } from '../../hooks/useBenefits.ts';
import BenefitCard from './BenefitCard.tsx';
import Routes from '../../../../../constants/navigation/Routes.ts';
import { useNavigation } from '@react-navigation/native';
import BenefitEmptyList from './BenefitEmptyList.tsx';

const BenefitsPreview = () => {
  const benefits = useSelector(selectBenefits);
  const isLoading = useSelector(selectBenefitsLoading);
  const navigation = useNavigation();
  useBenefits();

  const handleNavigateToBenefitsFullView = () => {
    navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
  };

  const hasBenefits = benefits.length > 0;
  const topBenefits = benefits.slice(0, 3);

  const displayHeader = hasBenefits ? (
    <Pressable onPress={handleNavigateToBenefitsFullView}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Text variant={TextVariant.HeadingMd}>
          {strings('rewards.benefits.title')}
        </Text>
        <Icon name={IconName.ArrowRight} size={IconSize.Md} />
      </Box>
    </Pressable>
  ) : (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2"
    >
      <Text variant={TextVariant.HeadingMd}>
        {strings('rewards.benefits.title')}
      </Text>
    </Box>
  );

  const displayContent = hasBenefits ? (
    <Box
      twClassName={`gap-3`}
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
    >
      {topBenefits.map((benefit) => (
        <BenefitCard key={benefit.id} benefit={benefit} />
      ))}
    </Box>
  ) : (
    <BenefitEmptyList />
  );

  return (
    <Box
      twClassName="gap-3 px-4 pb-6"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      {displayHeader}
      {isLoading ? (
        <Skeleton height={154} twClassName="rounded-lg" />
      ) : (
        displayContent
      )}
    </Box>
  );
};

export default BenefitsPreview;
