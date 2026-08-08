import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import OnboardingCryptoExperienceQuestionnaire from './OnboardingCryptoExperienceQuestionnaire';
import { OnboardingCryptoExperienceQuestionnaireTestIds } from './OnboardingCryptoExperienceQuestionnaire.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockOnComplete = jest.fn();

const mockCryptoExperienceRouteParams: {
  onComplete: typeof mockOnComplete;
  accountType?: string;
} = {
  onComplete: mockOnComplete,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      key: 'OnboardingCryptoExperienceQuestionnaire',
      name: 'OnboardingCryptoExperienceQuestionnaire',
      params: mockCryptoExperienceRouteParams,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue(undefined),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

const renderComponent = () =>
  renderScreen(
    OnboardingCryptoExperienceQuestionnaire,
    { name: 'OnboardingCryptoExperienceQuestionnaire' },
    { state: {} },
  );

describe('OnboardingCryptoExperienceQuestionnaire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockCryptoExperienceRouteParams.accountType;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  describe('rendering', () => {
    it('renders the screen', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingCryptoExperienceQuestionnaireTestIds.SCREEN,
        ),
      ).toBeOnTheScreen();
    });

    it('renders all experience options', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}new`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}beginner`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}intermediate`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}advanced`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('hardware back', () => {
    it('subscribes to hardware back and consumes the back press', () => {
      const spy = jest.spyOn(BackHandler, 'addEventListener');

      renderComponent();

      expect(spy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
      const call = spy.mock.calls.find((c) => c[0] === 'hardwareBackPress');
      const handler = call?.[1] as () => boolean;
      expect(handler()).toBe(true);

      spy.mockRestore();
    });
  });

  describe('layout on Android', () => {
    afterEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('renders when Platform OS is Android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');

      expect(() => renderComponent()).not.toThrow();
    });
  });

  describe('analytics on mount', () => {
    it('fires Viewed event on mount', () => {
      renderComponent();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED,
      );
      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(viewedBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'crypto_experience',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('includes account_type in Viewed event when route supplies accountType', () => {
      mockCryptoExperienceRouteParams.accountType = 'imported';

      renderComponent();

      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;

      expect(viewedBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'crypto_experience',
          account_type: 'imported',
        }),
      );
    });
  });

  describe('option selection', () => {
    it('selects a single option at a time', () => {
      renderComponent();

      const beginnerOption = screen.getByTestId(
        `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}beginner`,
      );
      const advancedOption = screen.getByTestId(
        `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}advanced`,
      );

      fireEvent.press(beginnerOption);
      expect(beginnerOption.props.accessibilityState.selected).toBe(true);

      fireEvent.press(advancedOption);
      expect(advancedOption.props.accessibilityState.selected).toBe(true);
      expect(beginnerOption.props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Continue button behaviour', () => {
    it('fires Submitted with skipped=true when no option selected', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED,
      );
      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'crypto_experience',
          name: null,
          skipped: true,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('fires Submitted with name and skipped=false when selected', async () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}intermediate`,
        ),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'crypto_experience',
          name: 'intermediate',
          skipped: false,
        }),
      );
    });

    it('includes account_type in Submitted when route supplies accountType', async () => {
      mockCryptoExperienceRouteParams.accountType = 'hardware_wallet';

      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'crypto_experience',
          skipped: true,
          account_type: 'hardware_wallet',
        }),
      );
    });

    it('calls onComplete after pressing Continue', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
      });
    });
  });
});
