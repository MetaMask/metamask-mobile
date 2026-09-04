import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import {
  BENEFITS,
  DEFAULT_PLAN,
  PLANS,
  type BenefitDetailItem,
  type PlanId,
  BENEFIT_DETAILS,
} from './Benefits.constants';
import { BenefitsTestIds } from './Benefits.testIds';
import { BenefitRow } from '../../../shared/pro';
import BenefitDetails from './components/BenefitDetails';
import PlanSelectorCard from './components/PlanSelectorCard';
import PlanSelectorCardSkeleton from './components/PlanSelectorCardSkeleton';
import { strings } from '../../../../../../locales/i18n';
import { useSubscriptionPricing } from './hooks/useSubscriptionPricing';

interface BenefitsProps {
  onSuccess: () => void;
  initialPlan?: PlanId;
}

const Benefits = ({ onSuccess, initialPlan }: BenefitsProps) => {
  const { isLoading, hasError, retry } = useSubscriptionPricing();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialPlan ?? DEFAULT_PLAN,
  );

  const [isBenefitDetailSheetOpen, setIsBenefitDetailSheetOpen] =
    useState(false);
  const [selectedBenfitDetail, setSelectedBenfitDetail] =
    useState<BenefitDetailItem | null>(null);

  const handleBenefitPress = useCallback((id: string) => {
    setIsBenefitDetailSheetOpen(true);
    setSelectedBenfitDetail(
      BENEFIT_DETAILS.find((detail) => detail.id === id) ?? null,
    );
  }, []);

  const handleBenefitDetailSheetClose = useCallback(() => {
    setIsBenefitDetailSheetOpen(false);
  }, []);

  const handleCtaPress = useCallback(() => {
    if (isLoading || hasError) {
      return;
    }
    onSuccess();
  }, [hasError, isLoading, onSuccess]);

  return (
    <Box
      twClassName="flex-1 bg-background-default"
      testID={BenefitsTestIds.CONTAINER}
    >
      {/* Header */}
      <Box twClassName="px-4 py-2">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="mb-2"
          testID={BenefitsTestIds.TITLE}
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
            testID={BenefitsTestIds.PRICE_LINE}
          >
            {strings('pro_subscription.description')}
          </Text>
        </Box>
      </Box>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Benefits list */}
        <Box twClassName="px-4 pb-2">
          {BENEFITS.map((item) => (
            <BenefitRow
              key={item.id}
              item={item}
              onPress={() => handleBenefitPress(item.id)}
              selectedPlan={selectedPlan}
            />
          ))}
        </Box>
      </ScrollView>

      {/* Plan selector */}
      <Box twClassName="flex flex-col gap-y-4 px-4 pt-3 pb-2 border-t border-border-muted">
        {isLoading ? (
          <Box
            twClassName="flex flex-col gap-y-4"
            testID={BenefitsTestIds.PRICING_LOADING}
            accessibilityLabel={strings('pro_subscription.pricing.loading')}
          >
            {PLANS.map((plan) => (
              <PlanSelectorCardSkeleton key={plan.id} />
            ))}
          </Box>
        ) : null}

        {hasError ? (
          <Box
            twClassName="flex flex-col gap-y-3"
            testID={BenefitsTestIds.PRICING_ERROR}
          >
            <BannerAlert
              severity={BannerAlertSeverity.Danger}
              description={strings('pro_subscription.pricing.error')}
            />
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={retry}
              testID={BenefitsTestIds.PRICING_RETRY_BUTTON}
              isFullWidth
            >
              {strings('pro_subscription.pricing.retry')}
            </Button>
          </Box>
        ) : null}

        {!isLoading && !hasError
          ? PLANS.map((plan) => (
              <PlanSelectorCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan === plan.id}
                onPress={setSelectedPlan}
              />
            ))
          : null}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleCtaPress}
          testID={BenefitsTestIds.CTA_BUTTON}
          isDisabled={isLoading || hasError}
          isFullWidth
        >
          {strings('pro_subscription.join_pro')}
        </Button>
      </Box>

      {isBenefitDetailSheetOpen && selectedBenfitDetail && (
        <BenefitDetails
          onClose={handleBenefitDetailSheetClose}
          details={selectedBenfitDetail}
          selectedPlan={selectedPlan}
        />
      )}
    </Box>
  );
};

export default Benefits;
