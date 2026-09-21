import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
  Skeleton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import { useSelector } from 'react-redux';
import {
  selectBenefits,
  selectBenefitsLoading,
} from '../../../../../reducers/rewards/selectors.ts';
import { useBenefits } from '../../hooks/useBenefits.ts';
import BenefitPreviewCard, {
  BENEFIT_PREVIEW_CARD_HEIGHT,
  BENEFIT_PREVIEW_CARD_WIDTH,
} from './BenefitPreviewCard.tsx';
import Routes from '../../../../../constants/navigation/Routes.ts';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import BenefitEmptyList from './BenefitEmptyList.tsx';

const BENEFIT_CARD_GAP = 12;
const BENEFIT_CARD_SNAP_INTERVAL =
  BENEFIT_PREVIEW_CARD_WIDTH + BENEFIT_CARD_GAP;

const BenefitsPreview = () => {
  const tw = useTailwind();
  const benefits = useSelector(selectBenefits);
  const isLoading = useSelector(selectBenefitsLoading);
  const navigation = useNavigation<AppNavigationProp>();
  useBenefits();

  const handleNavigateToBenefitsFullView = () => {
    navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
  };

  const hasBenefits = benefits.length > 0;
  const topBenefits = benefits.slice(0, 3);

  const benefitsCountLabel =
    benefits.length > 99 ? '99+' : String(benefits.length);

  const benefitsCountBadge =
    benefits.length > 0 ? (
      <Tag severity={TagSeverity.Neutral}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.benefits.available_count', {
            count: benefitsCountLabel,
          })}
        </Text>
      </Tag>
    ) : null;

  const displayHeader = hasBenefits ? (
    <SectionHeader
      title={strings('rewards.benefits.title')}
      titleAccessory={
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
          twClassName="shrink-0"
        />
      }
      // The growing end accessory takes the remaining row width so the count
      // tag sits flush against the right edge instead of next to the title.
      endAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.End}
          twClassName="grow"
        >
          {benefitsCountBadge}
        </Box>
      }
      isInteractive
      onPress={handleNavigateToBenefitsFullView}
    />
  ) : (
    <SectionHeader title={strings('rewards.benefits.title')} />
  );

  const displayContent = hasBenefits ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={BENEFIT_CARD_SNAP_INTERVAL}
      snapToAlignment="start"
      contentContainerStyle={tw.style('gap-3 px-4')}
      testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS}
    >
      {topBenefits.map((benefit) => (
        <BenefitPreviewCard key={benefit.id} benefit={benefit} />
      ))}
    </ScrollView>
  ) : (
    <Box twClassName="px-4">
      <BenefitEmptyList />
    </Box>
  );

  return (
    <Box testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION}>
      {displayHeader}
      {/* paddingTop matches the Home tab, where sections pair SectionHeader
          with a pt-3 content box. The carousel is full-bleed, so horizontal
          padding lives on the scroll content instead of this box. */}
      <Box paddingTop={3} twClassName="pb-6">
        {isLoading ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-3 px-4"
            testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SKELETON}
          >
            {[0, 1].map((index) => (
              <Skeleton
                key={index}
                style={tw.style('rounded-xl', {
                  width: BENEFIT_PREVIEW_CARD_WIDTH,
                  height: BENEFIT_PREVIEW_CARD_HEIGHT,
                })}
              />
            ))}
          </Box>
        ) : (
          displayContent
        )}
      </Box>
    </Box>
  );
};

export default BenefitsPreview;
