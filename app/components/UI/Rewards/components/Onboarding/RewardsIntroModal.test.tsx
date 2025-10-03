import React from 'react';
import { renderWithProviders } from './testUtils';
import RewardsIntroModal from './RewardsIntroModal';
import storageWrapper from '../../../../../store/storage-wrapper';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';

// Mock child component to capture props
const mockOnboardingIntroStep = jest.fn((_props: Record<string, unknown>) => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.createElement(View, { testID: 'onboarding-intro-step' });
});

jest.mock('./OnboardingIntroStep', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockOnboardingIntroStep(props),
}));

// Mock strings to stable values
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

describe('RewardsIntroModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders OnboardingIntroStep with expected strings', () => {
    renderWithProviders(<RewardsIntroModal />);

    expect(mockOnboardingIntroStep).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'mocked_rewards.onboarding.gtm_title',
        description: 'mocked_rewards.onboarding.gtm_description',
        confirmLabel: 'mocked_rewards.onboarding.gtm_confirm',
      }),
    );
  });

  it('marks rewards intro modal as seen in storage on mount', async () => {
    const setItemSpy = jest
      .spyOn(storageWrapper, 'setItem')
      .mockResolvedValueOnce(undefined);

    renderWithProviders(<RewardsIntroModal />);

    // Effect should trigger setItem once
    expect(setItemSpy).toHaveBeenCalledWith(REWARDS_GTM_MODAL_SHOWN, 'true');
  });
});
