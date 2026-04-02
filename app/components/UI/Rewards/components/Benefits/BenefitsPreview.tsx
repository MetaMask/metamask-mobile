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
import React, { useCallback, useEffect, useMemo } from 'react';
import {ActivityIndicator, Pressable} from 'react-native';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BenefitEmptyList from './BenefitEmptyList.tsx';

const BenefitsPreview = () => {
  const tw = useTailwind();
  const benefits = useSelector(selectBenefits);
  const isLoading = useSelector(selectBenefitsLoading);
  const { getAllBenefits } = useBenefits();
  const navigation = useNavigation();

  useEffect(() => {
    getAllBenefits().then();
  }, [getAllBenefits]);

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
  }, [navigation]);

  const hasBenefits = useMemo(() => benefits.length > 0, [benefits]);
  const topBenefits = useMemo(() => benefits.slice(0, 3), [benefits]);

  const displayHeader = useMemo(() => {
    if (hasBenefits) {
      return (
        <Pressable onPress={handleNavigateToCampaigns}>
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
      );
    }
    return (
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
  }, [hasBenefits, handleNavigateToCampaigns]);

  const displayContent = useMemo(() => {
    if (isLoading) {
      return <Skeleton style={tw.style('h-[154px] rounded-xl')} />;
    }
    if (!hasBenefits) {
      return <BenefitEmptyList />;
    }
    return (
      <Box
        twClassName={`gap-3`}
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
      >
        {topBenefits.map((benefit, i) => (
          <BenefitCard key={i} benefit={benefit} />
        ))}
      </Box>
    );
  }, [isLoading, hasBenefits, topBenefits, tw]);

  return (
    <Box
      twClassName="gap-3 p-4 pb-6"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      {displayHeader}
      {displayContent}
    </Box>
  );
};

export default BenefitsPreview;
