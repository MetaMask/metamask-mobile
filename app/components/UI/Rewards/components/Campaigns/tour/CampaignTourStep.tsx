import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  Box,
  BoxJustifyContent,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import RewardsThemeImageComponent from '../../ThemeImageComponent/RewardsThemeImageComponent';
import type { OndoCampaignTourStepDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { documentToPlainText } from '../../ContentfulRichText/ContentfulRichText';

export const CAMPAIGN_TOUR_STEP_TEST_IDS = {
  CONTAINER: 'campaign-tour-step-container',
  TITLE: 'campaign-tour-step-title',
  DESCRIPTION: 'campaign-tour-step-description',
  NEXT_BUTTON: 'campaign-tour-step-next-button',
  SKIP_BUTTON: 'campaign-tour-step-skip-button',
} as const;

interface CampaignTourStepProps {
  step: OndoCampaignTourStepDto;
}

const CampaignTourStep: React.FC<CampaignTourStepProps> = ({ step }) => {
  const tw = useTailwind();

  return (
    <ScrollView
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('flex-grow')}
      showsVerticalScrollIndicator={false}
    >
      <Box twClassName="flex-1 px-6 pt-3">
        <Box>
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            twClassName="text-left mb-1.5"
            testID={CAMPAIGN_TOUR_STEP_TEST_IDS.TITLE}
          >
            {documentToPlainText(step.title)}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-left mb-4"
            testID={CAMPAIGN_TOUR_STEP_TEST_IDS.DESCRIPTION}
          >
            {documentToPlainText(step.description)}
          </Text>
        </Box>

        {step.image && (
          <Box
            twClassName="flex-1 w-full"
            justifyContent={BoxJustifyContent.Center}
          >
            <RewardsThemeImageComponent
              themeImage={step.image}
              style={tw.style('w-full h-[400px] max-h-[400px]')}
            />
          </Box>
        )}
      </Box>
    </ScrollView>
  );
};

export default CampaignTourStep;
