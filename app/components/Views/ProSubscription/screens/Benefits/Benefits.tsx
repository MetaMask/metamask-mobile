import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
  Checkbox,
} from '@metamask/design-system-react-native';
import { isProduction } from '../../../../../util/environment';
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
import { useMoneyAccountPlusTrialEligibility } from './hooks/useMoneyAccountPlusTrialEligibility';
import {
  getBenefitsPriceLine,
  getPlanSelectorCardCopy,
  resolveSelectedPlanId,
} from './utils/getMoneyAccountPlusPricingCopy';
import {
  getSelectedPlusPlan,
  type SelectedPlusPlan,
} from './utils/getSelectedPlusPlan';
import { useStartProSubscription } from '../../hooks/useStartProSubscription';
import { isSubscriptionAlreadyStartingError } from '../../hooks/isSubscriptionAlreadyStartingError';
import { StartProSubscriptionOutcome } from '../../utils/proSubscriptionPaymentStatus';
import {
  PLUS_PRICING_STATUS,
  type PlusPricingStatus,
} from './utils/mapMoneyAccountPlusPricing';

interface BenefitsProps {
  onSuccess: (plan: SelectedPlusPlan) => void;
  /** On-ramp or bridge funding is still in flight. Caller opens Pro Hub. */
  onProcessing: () => void;
  onCheckoutStart: () => void;
  onCheckoutError: () => void;
  onPlanChange?: (planId: PlanId) => void;
  initialPlan?: PlanId;
}

/**
 * Plan cards stay hidden while prices load, and while the trial check is
 * still running. A pricing error, or a price list that cannot be shown,
 * does not wait on the trial check.
 *
 * @param isPricingLoading - True while subscription prices are loading.
 * @param isTrialEligibilityLoading - True while the trial check is loading.
 * @param hasError - True when prices failed to load.
 * @param pricingStatus - Resolved price-list status.
 * @returns Whether the plan cards and trial copy should stay hidden.
 */
function isBenefitsPlanListLoading(
  isPricingLoading: boolean,
  isTrialEligibilityLoading: boolean,
  hasError: boolean,
  pricingStatus: PlusPricingStatus,
): boolean {
  if (isPricingLoading) {
    return true;
  }
  if (
    hasError ||
    pricingStatus === PLUS_PRICING_STATUS.unavailable ||
    pricingStatus === PLUS_PRICING_STATUS.malformed
  ) {
    return false;
  }
  return isTrialEligibilityLoading;
}

/**
 * Button label for the one loaded answer. Loading copy is shown until the
 * trial check finishes, then the label is trial or paid.
 *
 * @param isPlansLoading - True while plan cards are still hidden.
 * @param selectedPlanOffersTrial - True when the selected plan includes a trial.
 * @returns The localized call-to-action label.
 */
function getBenefitsCtaLabel(
  isPlansLoading: boolean,
  selectedPlanOffersTrial: boolean,
): string {
  if (isPlansLoading) {
    return strings('pro_subscription.pricing.loading');
  }
  if (selectedPlanOffersTrial) {
    return strings('pro_subscription.start_free_trial');
  }
  return strings('pro_subscription.join_orange');
}

const Benefits = ({
  onSuccess,
  onProcessing,
  onCheckoutStart,
  onCheckoutError,
  onPlanChange,
  initialPlan,
}: BenefitsProps) => {
  const tw = useTailwind();
  const { plusPricing, isLoading, hasError, retry } = useSubscriptionPricing();
  const { isEligibleForTrial, isLoading: isTrialEligibilityLoading } =
    useMoneyAccountPlusTrialEligibility();
  const { startSubscription, isSubmitting, errorMessage } =
    useStartProSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialPlan ?? DEFAULT_PLAN,
  );

  const [enableTestClocks, setEnableTestClocks] = useState(false);
  const [isBenefitDetailSheetOpen, setIsBenefitDetailSheetOpen] =
    useState(false);
  const [selectedBenfitDetail, setSelectedBenfitDetail] =
    useState<BenefitDetailItem | null>(null);

  const resolvedPlan = resolveSelectedPlanId(selectedPlan, plusPricing);
  const priceLine = getBenefitsPriceLine(plusPricing);
  const isPricingReady = plusPricing.status === PLUS_PRICING_STATUS.ready;

  const visiblePlans = useMemo(
    () =>
      PLANS.flatMap((plan) => {
        const copy = getPlanSelectorCardCopy(
          plan.id,
          plusPricing,
          isEligibleForTrial,
        );
        if (copy === undefined) {
          return [];
        }
        return [{ plan, copy }];
      }),
    [plusPricing, isEligibleForTrial],
  );

  const selectedPlanOffersTrial = visiblePlans.some(
    ({ plan, copy }) => plan.id === resolvedPlan && Boolean(copy.trialLabel),
  );

  const isPlansLoading = isBenefitsPlanListLoading(
    isLoading,
    isTrialEligibilityLoading,
    hasError,
    plusPricing.status,
  );
  const canSelectPlans =
    !isPlansLoading && !hasError && isPricingReady && visiblePlans.length > 0;
  const isCtaDisabled = !canSelectPlans || isSubmitting;

  const handleBenefitPress = useCallback((id: string) => {
    setIsBenefitDetailSheetOpen(true);
    setSelectedBenfitDetail(
      BENEFIT_DETAILS.find((detail) => detail.id === id) ?? null,
    );
  }, []);

  const handleBenefitDetailSheetClose = useCallback(() => {
    setIsBenefitDetailSheetOpen(false);
  }, []);

  const handleCtaPress = useCallback(async () => {
    if (isCtaDisabled) {
      return;
    }

    const checkoutPlan = getSelectedPlusPlan(resolvedPlan, plusPricing);
    if (checkoutPlan === undefined) {
      return;
    }

    onCheckoutStart();

    try {
      const { outcome } = await startSubscription(checkoutPlan, {
        isTrial: selectedPlanOffersTrial,
        enableTestClocks,
      });
      if (outcome === StartProSubscriptionOutcome.Processing) {
        onProcessing();
        return;
      }
      onSuccess(checkoutPlan);
    } catch (error) {
      // A second tap rejects while the first checkout is still running.
      // Treating that as a failure clears checkout and skips Success.
      if (isSubscriptionAlreadyStartingError(error)) {
        return;
      }
      // The hook logs the failure and exposes localized error state.
      onCheckoutError();
    }
  }, [
    isCtaDisabled,
    onCheckoutError,
    onCheckoutStart,
    onProcessing,
    onSuccess,
    enableTestClocks,
    plusPricing,
    resolvedPlan,
    selectedPlanOffersTrial,
    startSubscription,
  ]);

  const handlePlanPress = useCallback(
    (planId: PlanId) => {
      setSelectedPlan(planId);
      onPlanChange?.(planId);
    },
    [onPlanChange],
  );

  return (
    <Box
      className="flex-1 bg-background-default"
      testID={BenefitsTestIds.CONTAINER}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('w-full')}
      >
        {/* Header */}
        <Box className="w-full px-4 py-2">
          <Text
            variant={TextVariant.HeadingLg}
            className="mb-2 w-full"
            testID={BenefitsTestIds.TITLE}
          >
            {strings('pro_subscription.title')}
          </Text>
          {priceLine ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              className="w-full gap-2 flex-wrap"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                className="w-full"
                testID={BenefitsTestIds.PRICE_LINE}
              >
                {priceLine}
              </Text>
            </Box>
          ) : null}
        </Box>

        {/* Benefits list */}
        <Box className="w-full px-4 pb-2">
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

      <Box className="flex flex-col gap-y-4 px-4 pt-3 pb-2 border-t border-border-muted">
        {isPlansLoading ? (
          <Box
            className="flex flex-col gap-y-4"
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
            className="flex flex-col gap-y-3"
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

        {!isLoading &&
        !hasError &&
        plusPricing.status === PLUS_PRICING_STATUS.unavailable ? (
          <Box
            className="flex flex-col gap-y-3"
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

        {!isLoading &&
        !hasError &&
        plusPricing.status === PLUS_PRICING_STATUS.malformed ? (
          <Box
            className="flex flex-col gap-y-3"
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
                isDisabled={isSubmitting}
                onPress={handlePlanPress}
              />
            ))
          : null}

        {!isProduction() ? (
          <Checkbox
            label={strings('pro_subscription.enable_stripe_test_clocks')}
            labelProps={{ style: tw.style('flex-1') }}
            isSelected={enableTestClocks}
            onChange={setEnableTestClocks}
            testID={BenefitsTestIds.TEST_CLOCKS_CHECKBOX}
            className="items-start"
          />
        ) : null}

        {errorMessage ? (
          <BannerAlert
            severity={BannerAlertSeverity.Danger}
            description={errorMessage}
            testID={BenefitsTestIds.JOIN_ERROR}
          />
        ) : null}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleCtaPress}
          testID={BenefitsTestIds.CTA_BUTTON}
          isDisabled={isCtaDisabled}
          isLoading={isSubmitting}
          isFullWidth
        >
          {getBenefitsCtaLabel(isPlansLoading, selectedPlanOffersTrial)}
        </Button>
        {!isPlansLoading && selectedPlanOffersTrial ? (
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            className="text-center"
            testID={BenefitsTestIds.FREE_TRIAL_DESCRIPTION}
          >
            {strings('pro_subscription.free_trial_description')}
          </Text>
        ) : null}
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
