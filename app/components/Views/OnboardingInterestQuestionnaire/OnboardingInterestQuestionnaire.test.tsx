import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { BackHandler, Platform, View, Pressable, Text } from 'react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import OnboardingInterestQuestionnaire from './OnboardingInterestQuestionnaire';
import { OnboardingInterestQuestionnaireTestIds } from './OnboardingInterestQuestionnaire.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../locales/i18n';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';

const MockView = View;
const MockPressable = Pressable;
const MockText = Text;

jest.mock('./OtherBottomSheet', () => ({
  __esModule: true,
  default: function MockOtherBottomSheet({
    onClose,
    onDone,
    initialValue,
  }: {
    onClose: () => void;
    onDone: (value: string) => void;
    initialValue?: string;
  }) {
    return (
      <MockView testID="mock-other-bottom-sheet">
        <MockText testID="mock-other-initial-value">{initialValue}</MockText>
        <MockPressable
          testID="mock-other-done"
          onPress={() => onDone('Custom usage')}
        >
          <MockText>Done</MockText>
        </MockPressable>
        <MockPressable
          testID="mock-other-done-empty"
          onPress={() => onDone('')}
        >
          <MockText>Done Empty</MockText>
        </MockPressable>
        <MockPressable testID="mock-other-close" onPress={onClose}>
          <MockText>Close</MockText>
        </MockPressable>
      </MockView>
    );
  },
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockNavigate = jest.fn();
const mockOnComplete = jest.fn();

const mockInterestQuestionnaireRouteParams: {
  onComplete: typeof mockOnComplete;
  accountType?: string;
} = {
  onComplete: mockOnComplete,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      reset: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      key: 'OnboardingInterestQuestionnaire',
      name: 'OnboardingInterestQuestionnaire',
      params: mockInterestQuestionnaireRouteParams,
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
    OnboardingInterestQuestionnaire,
    { name: 'OnboardingInterestQuestionnaire' },
    { state: {} },
    { onComplete: mockOnComplete },
  );

describe('OnboardingInterestQuestionnaire', () => {
  beforeEach(() => {
    delete mockInterestQuestionnaireRouteParams.accountType;
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  describe('rendering', () => {
    it('renders the screen container', () => {
      renderComponent();

      expect(
        screen.getByTestId(OnboardingInterestQuestionnaireTestIds.SCREEN),
      ).toBeOnTheScreen();
    });

    it('renders the title text', () => {
      renderComponent();

      expect(
        screen.getByText(strings('onboarding_interest_questionnaire.title')),
      ).toBeOnTheScreen();
    });

    it('renders the description text', () => {
      renderComponent();

      expect(
        screen.getByText(
          strings('onboarding_interest_questionnaire.description'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders all seven option rows', () => {
      renderComponent();

      const optionIds = [
        'swap_tokens',
        'trade_perpetuals',
        'prediction_markets',
        'send_receive_crypto',
        'earn_and_spend',
        'use_other_crypto_apps',
        'other',
      ];

      optionIds.forEach((id) => {
        expect(
          screen.getByTestId(
            `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${id}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders the Next button', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the Skip button', () => {
      renderComponent();

      expect(
        screen.getByTestId(OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON),
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
          question_type: 'interest',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('omits account_type from Viewed when route has no accountType', () => {
      delete mockInterestQuestionnaireRouteParams.accountType;

      renderComponent();

      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;

      expect(viewedBuilder.addProperties).toHaveBeenCalledWith({
        question_type: 'interest',
      });
    });

    it('includes account_type in Viewed event when route supplies accountType', () => {
      mockInterestQuestionnaireRouteParams.accountType = 'imported';

      renderComponent();

      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;

      expect(viewedBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'interest',
          account_type: 'imported',
        }),
      );
    });
  });

  describe('option selection', () => {
    it('marks an option as selected when tapped', () => {
      renderComponent();

      const option = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}swap_tokens`,
      );

      fireEvent.press(option);

      expect(option.props.accessibilityState.checked).toBe(true);
    });

    it('deselects an already-selected option when tapped again', () => {
      renderComponent();

      const option = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}swap_tokens`,
      );

      fireEvent.press(option);
      fireEvent.press(option);

      expect(option.props.accessibilityState.checked).toBe(false);
    });

    it('allows selecting multiple options independently', () => {
      renderComponent();

      const swapOption = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}swap_tokens`,
      );
      const perpsOption = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}trade_perpetuals`,
      );

      fireEvent.press(swapOption);
      fireEvent.press(perpsOption);

      expect(swapOption.props.accessibilityState.checked).toBe(true);
      expect(perpsOption.props.accessibilityState.checked).toBe(true);
    });
  });

  describe('Other option', () => {
    it('does not render the bottom sheet by default', () => {
      renderComponent();

      expect(
        screen.queryByTestId('mock-other-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('opens the bottom sheet when Other is pressed', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );

      expect(screen.getByTestId('mock-other-bottom-sheet')).toBeOnTheScreen();
    });

    it('displays entered text below Other after Done', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-other-done'));

      expect(
        screen.getByTestId(OnboardingInterestQuestionnaireTestIds.OTHER_TEXT),
      ).toHaveTextContent('Custom usage');
    });
  });

  describe('Next button behaviour', () => {
    it('fires Submitted and calls onComplete with selections', async () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}swap_tokens`,
        ),
      );

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
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
          question_type: 'interest',
          selected_interests: ['swap_tokens'],
          item_count: 1,
          skipped: false,
        }),
      );
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('disables Continue button when no option is selected', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
        ),
      ).toBeDisabled();
    });
  });

  describe('Other option extended', () => {
    it('hides the bottom sheet when the close button is pressed', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      expect(screen.getByTestId('mock-other-bottom-sheet')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('mock-other-close'));

      expect(
        screen.queryByTestId('mock-other-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('deselects the Other option when Done is called with an empty string', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-other-done'));

      const otherOption = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
      );
      expect(otherOption.props.accessibilityState.checked).toBe(true);

      fireEvent.press(otherOption);
      fireEvent.press(screen.getByTestId('mock-other-done-empty'));

      expect(otherOption.props.accessibilityState.checked).toBe(false);
    });

    it('hides the bottom sheet after Done is called with an empty string', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-other-done-empty'));

      expect(
        screen.queryByTestId('mock-other-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('does not display the other text when Done is called with an empty string', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-other-done-empty'));

      expect(
        screen.queryByTestId(OnboardingInterestQuestionnaireTestIds.OTHER_TEXT),
      ).not.toBeOnTheScreen();
    });

    it('passes the previously entered text as initialValue when Other is reopened', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );
      fireEvent.press(screen.getByTestId('mock-other-done'));

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}other`,
        ),
      );

      expect(screen.getByTestId('mock-other-initial-value')).toHaveTextContent(
        'Custom usage',
      );
    });
  });

  describe('Skip button behaviour', () => {
    it('fires Submitted with skipped=true and completes onboarding on Skip', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON,
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
          question_type: 'interest',
          selected_interests: [],
          item_count: 0,
          skipped: true,
        }),
      );

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('analytics guard', () => {
    it('fires the Viewed event only once even when options are selected', () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}swap_tokens`,
        ),
      );
      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}trade_perpetuals`,
        ),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        1,
        MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED,
      );
    });
  });

  describe('Redux account_type', () => {
    it('uses account_type from Redux store in the Viewed event when route has no accountType', () => {
      const useSelectorMock = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      useSelectorMock.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectOnboardingAccountType) return 'hardware';
          return undefined;
        },
      );

      renderComponent();

      const viewedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(viewedBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'interest',
          account_type: 'hardware',
        }),
      );

      useSelectorMock.mockReturnValue(undefined);
    });

    it('includes account_type from Redux in the Submitted event when route has no accountType', async () => {
      const useSelectorMock = jest.requireMock('react-redux')
        .useSelector as jest.Mock;
      useSelectorMock.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectOnboardingAccountType) return 'hardware';
          return undefined;
        },
      );

      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON,
          ),
        );
      });

      const submittedBuilder = mockCreateEventBuilder.mock.results[1]?.value;
      expect(submittedBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          account_type: 'hardware',
        }),
      );

      useSelectorMock.mockReturnValue(undefined);
    });
  });
});
