import React, { useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconColor,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import type {
  OndoCampaignHowItWorks,
  OndoCampaignPhase,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { getIconName } from '../../utils/formatUtils';

export const CAMPAIGN_HOW_IT_WORKS_TEST_IDS = {
  CONTAINER: 'campaign-how-it-works-container',
  TITLE: 'campaign-how-it-works-title',
  PHASE: 'campaign-how-it-works-phase',
  PHASE_CHIP: 'campaign-how-it-works-phase-chip',
  STEP: 'campaign-how-it-works-step',
  STEP_ICON: 'campaign-how-it-works-step-icon',
  STEP_TITLE: 'campaign-how-it-works-step-title',
  STEP_DESCRIPTION: 'campaign-how-it-works-step-description',
} as const;

interface CampaignHowItWorksProps {
  howItWorks: OndoCampaignHowItWorks;
}

const CampaignHowItWorks: React.FC<CampaignHowItWorksProps> = ({
  howItWorks,
}) => {
  const sortedPhases = useMemo(
    () => [...howItWorks.phases].sort((a, b) => a.sortOrder - b.sortOrder),
    [howItWorks.phases],
  );

  return (
    <Box twClassName="gap-4" testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER}>
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE}
      >
        {strings('rewards.campaign_details.how_it_works')}
      </Text>

      {sortedPhases.map((phase: OndoCampaignPhase, phaseIndex: number) => (
        <Box
          key={`phase-${phase.sortOrder}`}
          twClassName="gap-3"
          testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE}-${phaseIndex}`}
        >
          <Box twClassName="rounded-xl bg-muted px-2 py-1 self-start">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.PHASE_CHIP}-${phaseIndex}`}
            >
              {phase.daysLabel}
            </Text>
          </Box>

          {phase.steps.map((step, stepIndex) => (
            <Box
              key={`step-${phaseIndex}-${stepIndex}`}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              twClassName="gap-3"
              testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP}-${phaseIndex}-${stepIndex}`}
            >
              <Box twClassName="w-6 h-6 items-center justify-center">
                <Icon
                  name={getIconName(step.iconName)}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                  testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_ICON}-${phaseIndex}-${stepIndex}`}
                />
              </Box>
              <Box twClassName="flex-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-${phaseIndex}-${stepIndex}`}
                >
                  {step.title}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="text-alternative"
                  testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_DESCRIPTION}-${phaseIndex}-${stepIndex}`}
                >
                  {step.description}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default CampaignHowItWorks;
