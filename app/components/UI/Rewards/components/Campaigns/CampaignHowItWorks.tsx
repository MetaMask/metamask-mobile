import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBackgroundColor,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import type { CampaignHowItWorks as CampaignHowItWorksData } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import ContentfulRichText, {
  isDocument,
  documentToPlainText,
} from '../ContentfulRichText/ContentfulRichText';

export const CAMPAIGN_HOW_IT_WORKS_TEST_IDS = {
  CONTAINER: 'campaign-how-it-works-container',
  TITLE: 'campaign-how-it-works-title',
  STEP: 'campaign-how-it-works-step',
  STEP_INDEX: 'campaign-how-it-works-step-index',
  STEP_TITLE: 'campaign-how-it-works-step-title',
  STEP_DESCRIPTION: 'campaign-how-it-works-step-description',
} as const;

interface CampaignHowItWorksProps {
  howItWorks: CampaignHowItWorksData;
  showStepNumbers?: boolean;
  title?: string;
  showStepDividers?: boolean;
  stepIcons?: IconName[];
  groupSteps?: boolean;
}

const CampaignHowItWorks: React.FC<CampaignHowItWorksProps> = ({
  howItWorks,
  showStepNumbers = true,
  title,
  showStepDividers = false,
  stepIcons,
  groupSteps = false,
}) => (
  <Box
    twClassName={showStepDividers ? 'gap-0' : 'gap-4'}
    testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER}
  >
    <Text
      variant={TextVariant.HeadingMd}
      fontWeight={FontWeight.Bold}
      testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE}
    >
      {title ?? strings('rewards.campaign_details.how_it_works')}
    </Text>

    <Box twClassName={groupSteps ? 'rounded-xl bg-muted px-4' : ''}>
      {howItWorks.steps.map((step, stepIndex) => (
        <Box
          key={`step-${stepIndex}`}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName={`gap-3 ${showStepDividers ? 'py-4' : ''} ${
            showStepDividers && stepIndex < howItWorks.steps.length - 1
              ? 'border-b border-border-muted'
              : ''
          }`}
          testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP}-${stepIndex}`}
        >
          {stepIcons?.[stepIndex] && (
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              backgroundColor={BoxBackgroundColor.PrimaryMuted}
              twClassName="h-8 w-8 rounded-full"
            >
              <Icon
                name={stepIcons[stepIndex]}
                size={IconSize.Sm}
                color={IconColor.IconDefault}
              />
            </Box>
          )}
          {showStepNumbers && !stepIcons?.[stepIndex] && (
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              backgroundColor={BoxBackgroundColor.PrimaryMuted}
              twClassName="w-6 h-6 rounded-full"
              testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_INDEX}-${stepIndex}`}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {stepIndex + 1}
              </Text>
            </Box>
          )}
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_TITLE}-${stepIndex}`}
            >
              {documentToPlainText(step.title)}
            </Text>
            {isDocument(step.description) && (
              <ContentfulRichText
                document={step.description}
                testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_DESCRIPTION}-${stepIndex}`}
              />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

export default CampaignHowItWorks;
