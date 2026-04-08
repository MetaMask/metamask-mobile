import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
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
      contentContainerStyle={tw.style('flex-grow px-4 justify-center')}
      showsVerticalScrollIndicator={false}
    >
      {step.image && (
        <Box
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
          flexDirection={BoxFlexDirection.Column}
          twClassName="mb-6"
        >
          <RewardsThemeImageComponent
            themeImage={step.image}
            style={tw.style('w-64 h-64')}
          />
        </Box>
      )}

      <Box twClassName="w-full">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-center"
          testID={CAMPAIGN_TOUR_STEP_TEST_IDS.TITLE}
        >
          {documentToPlainText(step.title)}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="mt-2 text-center text-text-alternative"
          testID={CAMPAIGN_TOUR_STEP_TEST_IDS.DESCRIPTION}
        >
          {documentToPlainText(step.description)}
        </Text>
      </Box>
    </ScrollView>
  );
};

export default CampaignTourStep;
