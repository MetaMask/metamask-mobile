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
} from '@metamask/design-system-react-native';
import {
  BENEFITS_CONTENT_BY_VERSION,
  DEFAULT_PLAN,
  PLANS,
  type BenefitDetailItem,
  type PlanId,
} from './Benefits.constants';
import { BenefitsTestIds } from './Benefits.testIds';
import { BenefitRow } from '../../../shared/pro';
import BenefitDetails from './components/BenefitDetails';
import PlanSelectorCard from './components/PlanSelectorCard';
import { strings } from '../../../../../../locales/i18n';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  JOIN_PRO_PAYWALL_AB_TEST_EXPOSURE_OPTIONS,
  JOIN_PRO_PAYWALL_AB_TEST_KEY,
  JOIN_PRO_PAYWALL_VARIANTS,
} from '../../abTestConfig';

interface BenefitsProps {
  onSuccess: () => void;
  initialPlan?: PlanId;
}

const Benefits = ({ onSuccess, initialPlan }: BenefitsProps) => {
  const { variant } = useABTest(
    JOIN_PRO_PAYWALL_AB_TEST_KEY,
    JOIN_PRO_PAYWALL_VARIANTS,
    JOIN_PRO_PAYWALL_AB_TEST_EXPOSURE_OPTIONS,
  );
  const content = BENEFITS_CONTENT_BY_VERSION[variant.contentVersion];
  const [selectedPlan, setSelectedPlan] = useState<string>(
    initialPlan ?? DEFAULT_PLAN,
  );

  const [isBenefitDetailSheetOpen, setIsBenefitDetailSheetOpen] =
    useState(false);
  const [selectedBenfitDetail, setSelectedBenfitDetail] =
    useState<BenefitDetailItem | null>(null);

  const handleBenefitPress = useCallback(
    (id: string) => {
      setIsBenefitDetailSheetOpen(true);
      setSelectedBenfitDetail(
        content.benefitDetails.find((detail) => detail.id === id) ?? null,
      );
    },
    [content.benefitDetails],
  );

  const handleBenefitDetailSheetClose = useCallback(() => {
    setIsBenefitDetailSheetOpen(false);
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
          {strings(content.title)}
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
            {strings(content.description)}
          </Text>
        </Box>
      </Box>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Benefits list */}
        <Box twClassName="px-4 pb-2">
          {content.benefits.map((item) => (
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
          onPress={onSuccess}
          testID={BenefitsTestIds.CTA_BUTTON}
          isFullWidth
        >
          {strings(content.ctaLabel)}
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
