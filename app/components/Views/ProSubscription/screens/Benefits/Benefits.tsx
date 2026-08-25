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
import { strings } from '../../../../../../locales/i18n';

interface BenefitsProps {
  onSuccess: () => void;
  initialPlan?: PlanId;
}

const Benefits = ({ onSuccess, initialPlan }: BenefitsProps) => {
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
            />
          ))}
        </Box>
      </ScrollView>

      {/* Plan selector */}
      <Box twClassName="flex flex-col gap-y-4 px-4 pt-4 pb-2 border-t-2 border-border-muted">
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
          {strings('pro_subscription.join_pro')}
        </Button>
      </Box>

      {isBenefitDetailSheetOpen && selectedBenfitDetail && (
        <BenefitDetails
          onClose={handleBenefitDetailSheetClose}
          details={selectedBenfitDetail}
        />
      )}
    </Box>
  );
};

export default Benefits;
