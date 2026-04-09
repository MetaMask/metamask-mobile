import React from 'react';
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
import type { OndoCampaignHowItWorks } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import { getIconName } from '../../utils/formatUtils';
import ContentfulRichText, {
  isDocument,
  documentToPlainText,
} from '../ContentfulRichText/ContentfulRichText';

export const CAMPAIGN_HOW_IT_WORKS_TEST_IDS = {
  CONTAINER: 'campaign-how-it-works-container',
  TITLE: 'campaign-how-it-works-title',
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
}) => (
  <Box twClassName="gap-4" testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.CONTAINER}>
    <Text
      variant={TextVariant.HeadingMd}
      fontWeight={FontWeight.Bold}
      testID={CAMPAIGN_HOW_IT_WORKS_TEST_IDS.TITLE}
    >
      {strings('rewards.campaign_details.how_it_works')}
    </Text>

    {howItWorks.steps.map((step, stepIndex) => (
      <Box
        key={`step-${stepIndex}`}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        twClassName="gap-3"
        testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP}-${stepIndex}`}
      >
        <Box twClassName="w-6 h-6 items-center justify-center">
          <Icon
            name={getIconName(step.iconName)}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
            testID={`${CAMPAIGN_HOW_IT_WORKS_TEST_IDS.STEP_ICON}-${stepIndex}`}
          />
        </Box>
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
);

export default CampaignHowItWorks;
