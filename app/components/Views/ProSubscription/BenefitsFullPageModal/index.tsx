import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { useProSubscriptionEnabled } from '../../../../hooks/useProSubscriptionEnabled';
import {
  BENEFITS,
  DEFAULT_PLAN,
  PLANS,
  type BenefitItem,
  type PlanId,
} from './BenefitsFullPageModal.constants';
import { BenefitsFullPageModalTestIds } from './BenefitsFullPageModal.testIds';
import BenefitRow from './components/BenefitRow';
import PlanSelectorCard from './components/PlanSelectorCard';
import { strings } from '../../../../../locales/i18n';

// Badge background — not available as a design token.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const BADGE_BG = '#4B2AC4';

export interface BenefitsFullPageModalRouteParams {
  [Routes.PRO_SUBSCRIPTION.BENEFITS_FULL_PAGE_MODAL]: {
    source?: string;
    initialPlan?: PlanId;
  };
}

const BenefitsFullPageModal = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const route =
    useRoute<
      RouteProp<
        BenefitsFullPageModalRouteParams,
        typeof Routes.PRO_SUBSCRIPTION.BENEFITS_FULL_PAGE_MODAL
      >
    >();
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();

  const initialPlan = route.params?.initialPlan ?? DEFAULT_PLAN;
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);

  // Guard: dismiss immediately if the Pro feature flag is off.
  useEffect(() => {
    if (!isProSubscriptionEnabled) {
      navigation.goBack();
    }
  }, [isProSubscriptionEnabled, navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBenefitPress = useCallback(
    (item: BenefitItem) => {
      // SUB-993: stub — benefit detail sheet not yet implemented.
      navigation.navigate(
        Routes.PRO_SUBSCRIPTION.BENEFIT_DETAIL_SHEET as never,
        { benefitId: item.id } as never,
      );
    },
    [navigation],
  );

  const handleCtaPress = useCallback(() => {
    // SUB-994: stub — success screen not yet implemented.
    navigation.navigate(Routes.PRO_SUBSCRIPTION.SUCCESS as never);
  }, [navigation]);

  const activePlan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[0];

  return (
    <SafeAreaView
      style={tw.style('flex-1')}
      edges={['top']}
      testID={BenefitsFullPageModalTestIds.CONTAINER}
    >
      <Box twClassName="flex-1 bg-background-default">
        {/* Close button */}
        <Box twClassName="px-4 py-4 pb-10 flex-row items-center justify-end">
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={BenefitsFullPageModalTestIds.CLOSE_BUTTON}
          />
        </Box>

        {/* Header */}
        <Box twClassName="px-5 pt-2 pb-5">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="mb-2"
            testID={BenefitsFullPageModalTestIds.TITLE}
          >
            {strings('pro_subscription.title')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 flex-wrap"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              testID={BenefitsFullPageModalTestIds.PRICE_LINE}
            >
              {strings('pro_subscription.description')}
            </Text>
          </Box>
        </Box>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Benefits list */}
          <Box twClassName="px-5 pb-2">
            {BENEFITS.map((item) => (
              <BenefitRow
                key={item.id}
                item={item}
                onPress={handleBenefitPress}
              />
            ))}
          </Box>
        </ScrollView>

        {/* Plan selector */}
        <Box twClassName="flex flex-col gap-y-4 px-4 pt-4 pb-8 border-t-2 border-border-muted">
          {PLANS.map((plan) => (
            <PlanSelectorCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan === plan.id}
              onPress={setSelectedPlan}
            />
          ))}

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleCtaPress}
            testID={BenefitsFullPageModalTestIds.CTA_BUTTON}
            isFullWidth
          >
            {strings('pro_subscription.join_pro')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default BenefitsFullPageModal;
