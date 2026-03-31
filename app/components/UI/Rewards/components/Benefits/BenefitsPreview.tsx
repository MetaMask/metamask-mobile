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
import { ActivityIndicator, Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { useSelector } from 'react-redux';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../../reducers/benefits/selectors.ts';
import { useBenefits } from '../../hooks/useBenefits.ts';
import BenefitCard from './BenefitCard.tsx';
import Routes from '../../../../../constants/navigation/Routes.ts';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';

const BenefitsPreview = () => {
  const benefits = useSelector(selectBenefits);
  const isLoading = useSelector(selectBenefitsLoading);
  const { initBenefits } = useBenefits();
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    initBenefits().then();
  }, [initBenefits]);

  const handleNavigateToCampaigns = useCallback(() => {
    navigation.navigate(Routes.BENEFIT_LIST_VIEW);
  }, [navigation]);

  const hasBenefits = useMemo(
    () => benefits && benefits.length > 0,
    [benefits],
  );

  return (
    <Box
      twClassName="gap-3 p-4"
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}
    >
      <Pressable onPress={handleNavigateToCampaigns}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary.default} />
          )}
          <Text variant={TextVariant.HeadingMd}>
            {strings('rewards.benefits.title')}
          </Text>
          {!isLoading && hasBenefits && (
            <Icon name={IconName.ArrowRight} size={IconSize.Md} />
          )}
        </Box>
      </Pressable>

      <Box
        twClassName={`gap-3`}
        testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
      >
        {isLoading ? (
          <Skeleton height={'132px'} width="100%" />
        ) : hasBenefits ? (
          benefits
            .slice(0, 3)
            .map((benefit, i) => <BenefitCard benefit={benefit} />)
        ) : (
          <Box twClassName="flex-1 items-center justify-center gap-3">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              You don't have any benefits right now.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BenefitsPreview;
