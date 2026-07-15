import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ExperienceSkillBar } from './ExperienceSkillBar';
import { OnboardingCryptoExperienceQuestionnaireTestIds } from './OnboardingCryptoExperienceQuestionnaire.testIds';

describe('ExperienceSkillBar', () => {
  it.each([
    ['new', 1],
    ['beginner', 2],
    ['intermediate', 3],
    ['advanced', 4],
  ] as const)('renders skill bar for %s level', (level, _filledCount) => {
    render(<ExperienceSkillBar level={level} />);

    expect(
      screen.getByTestId(
        `${OnboardingCryptoExperienceQuestionnaireTestIds.SKILL_BAR_PREFIX}${level}`,
      ),
    ).toBeOnTheScreen();
  });
});
