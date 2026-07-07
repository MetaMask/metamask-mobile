import React from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import type { CryptoExperienceLevel } from './OnboardingCryptoExperienceQuestionnaire.types';
import { OnboardingCryptoExperienceQuestionnaireTestIds } from './OnboardingCryptoExperienceQuestionnaire.testIds';

const FILLED_BAR_COUNT: Record<CryptoExperienceLevel, number> = {
  new: 1,
  beginner: 2,
  intermediate: 3,
  advanced: 4,
};

const BAR_COUNT = 4;

interface ExperienceSkillBarProps {
  level: CryptoExperienceLevel;
}

export const ExperienceSkillBar = ({ level }: ExperienceSkillBarProps) => {
  const tw = useTailwind();
  const filledCount = FILLED_BAR_COUNT[level];

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      style={tw.style('items-end gap-0.5')}
      testID={`${OnboardingCryptoExperienceQuestionnaireTestIds.SKILL_BAR_PREFIX}${level}`}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const isFilled = index < filledCount;
        const barHeight = 6 + index * 3;

        return (
          <View
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            style={tw.style('w-1', {
              height: barHeight,
              backgroundColor: isFilled
                ? tw.color('success-default')
                : tw.color('background-muted'),
            })}
          />
        );
      })}
    </Box>
  );
};
