import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  BENEFIT_DETAILS,
  DEFAULT_PLAN,
  PLANS,
  type BenefitDetailItem,
  type PlanId,
} from './Benefits.constants';
import { BenefitsTestIds } from './Benefits.testIds';
import { BenefitRow } from '../../../shared/pro';
import BenefitDetails from './components/BenefitDetails';
import PlanSelectorCard from './components/PlanSelectorCard';
import PlanSelectorCardSkeleton from './components/PlanSelectorCardSkeleton';
import { strings } from '../../../../../../locales/i18n';
import { useSubscriptionPricing } from './hooks/useSubscriptionPricing';
import {
  getBenefitsPriceLine,
  getPlanSelectorCardCopy,
  resolveSelectedPlanId,
} from './utils/getMoneyAccountPlusPricingCopy';

interface BenefitsProps {
  onSuccess: () => void;
  initialPlan?: PlanId;
}

const Benefits = ({ onSuccess, initialPlan }: BenefitsProps) => {
  const { plusPricing, isLoading, hasError, retry } = useSubscriptionPricing();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialPlan ?? DEFAULT_PLAN,
  );

  const [isBenefitDetailSheetOpen, setIsBenefitDetailSheetOpen] =
    useState(false);
  const [selectedBenfitDetail, setSelectedBenfitDetail] =
    useState<BenefitDetailItem | null>(null);

  const resolvedPlan = resolveSelectedPlanId(selectedPlan, plusPricing);
  const priceLine = getBenefitsPriceLine(plusPricing);
  const isPricingReady = plusPricing.status === 'ready';
  const canSelectPlans = !isLoading && !hasError && isPricingReady;
  const isCtaDisabled = !canSelectPlans;

  const visiblePlans = useMemo(
    () =>
      PLANS.flatMap((plan) => {
        const copy = getPlanSelectorCardCopy(plan.id, plusPricing);
        if (copy === undefined) {
          return [];
        }
        return [{ plan, copy }];
      }),
    [plusPricing],
  );

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
    if (isCtaDisabled) {
      return;
    }
    onSuccess();
  }, [isCtaDisabled, onSuccess]);

  const handlePlanPress = useCallback((planId: PlanId) => {
    setSelectedPlan(planId);
  }, []);

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
        {priceLine ? (
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
              {priceLine}
            </Text>
          </Box>
        ) : null}
      </Box>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Benefits list */}
        <Box twClassName="px-4 pb-2">
          {BENEFITS.map((item) => (
            <BenefitRow
              key={item.id}
              item={item}
              onPress={() => handleBenefitPress(item.id)}
              selectedPlan={resolvedPlan}
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

        {!isLoading && !hasError && plusPricing.status === 'unavailable' ? (
          <Box
            twClassName="flex flex-col gap-y-3"
            testID={BenefitsTestIds.PRICING_UNAVAILABLE}
          >
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              description={strings('pro_subscription.pricing.unavailable')}
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

        {!isLoading && !hasError && plusPricing.status === 'malformed' ? (
          <Box
            twClassName="flex flex-col gap-y-3"
            testID={BenefitsTestIds.PRICING_MALFORMED}
          >
            <BannerAlert
              severity={BannerAlertSeverity.Danger}
              description={strings('pro_subscription.pricing.malformed')}
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

        {canSelectPlans
          ? visiblePlans.map(({ plan, copy }) => (
              <PlanSelectorCard
                key={plan.id}
                plan={plan}
                copy={copy}
                isSelected={resolvedPlan === plan.id}
                onPress={handlePlanPress}
              />
            ))
          : null}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleCtaPress}
          testID={BenefitsTestIds.CTA_BUTTON}
          isDisabled={isCtaDisabled}
          isFullWidth
        >
          {strings('pro_subscription.join_pro')}
        </Button>
      </Box>

      {isBenefitDetailSheetOpen && selectedBenfitDetail && (
        <BenefitDetails
          onClose={handleBenefitDetailSheetClose}
          details={selectedBenfitDetail}
          selectedPlan={resolvedPlan}
        />
      )}
    </Box>
  );
};

export default Benefits;
