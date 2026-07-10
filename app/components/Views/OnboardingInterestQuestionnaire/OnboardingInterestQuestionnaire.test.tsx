import React from 'react';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';
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
import Routes from '../../../constants/navigation/Routes';

const { strings: actualStrings } = jest.requireActual<
  typeof import('../../../../locales/i18n')
>('../../../../locales/i18n');

jest.mock('../../../../locales/i18n', () => {
  const actual = jest.requireActual('../../../../locales/i18n');
  return {
    ...actual,
    strings: jest.fn(actual.strings),
  };
});

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

    it('renders updated option labels from i18n', () => {
      renderComponent();

      expect(
        screen.getByText(
          strings(
            'onboarding_interest_questionnaire.option_buy_and_sell_crypto',
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          strings('onboarding_interest_questionnaire.option_advanced_trades'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders all six option cards in the grid', () => {
      renderComponent();

      const optionIds = [
        'buy_and_sell_crypto',
        'consolidate_wallets',
        'advanced_trades',
        'predict_sports_events',
        'crypto_as_money',
        'connect_apps_sites',
      ];

      optionIds.forEach((id) => {
        expect(
          screen.getByTestId(
            `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${id}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders three two-column grid rows', () => {
      renderComponent();

      [0, 1, 2].forEach((rowIndex) => {
        expect(
          screen.getByTestId(
            `${OnboardingInterestQuestionnaireTestIds.GRID_ROW_PREFIX}${rowIndex}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('renders all option cards when labels are long', () => {
      const longLabel =
        'Compra y vende tokens de criptomonedas con MetaMask para varias líneas';
      const stringsSpy = jest.mocked(strings);
      stringsSpy.mockImplementation((key: string) => {
        if (key.startsWith('onboarding_interest_questionnaire.option_')) {
          return longLabel;
        }
        return actualStrings(key);
      });

      renderComponent();

      expect(screen.getAllByText(longLabel)).toHaveLength(6);

      stringsSpy.mockRestore();
    });

    it('renders the Continue button', () => {
      renderComponent();

      expect(
        screen.getByTestId(
          OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
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
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}buy_and_sell_crypto`,
      );

      fireEvent.press(option);

      expect(option.props.accessibilityState.checked).toBe(true);
    });

    it('deselects an already-selected option when tapped again', () => {
      renderComponent();

      const option = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}buy_and_sell_crypto`,
      );

      fireEvent.press(option);
      fireEvent.press(option);

      expect(option.props.accessibilityState.checked).toBe(false);
    });

    it('allows selecting multiple options independently', () => {
      renderComponent();

      const buyOption = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}buy_and_sell_crypto`,
      );
      const predictOption = screen.getByTestId(
        `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}predict_sports_events`,
      );

      fireEvent.press(buyOption);
      fireEvent.press(predictOption);

      expect(buyOption.props.accessibilityState.checked).toBe(true);
      expect(predictOption.props.accessibilityState.checked).toBe(true);
    });
  });

  describe('Continue button behaviour', () => {
    it('fires Submitted with skipped=true and empty array when no option selected', async () => {
      renderComponent();

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
          selected_interests: [],
          item_count: 0,
          skipped: true,
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('includes account_type in Submitted event when route supplies accountType', async () => {
      mockInterestQuestionnaireRouteParams.accountType = 'hardware_wallet';

      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      const builderInstance = mockCreateEventBuilder.mock.results[1]?.value;

      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'interest',
          selected_interests: [],
          skipped: true,
          account_type: 'hardware_wallet',
        }),
      );
    });

    it('fires Submitted with skipped=false and correct interests when options selected', async () => {
      renderComponent();

      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}buy_and_sell_crypto`,
        ),
      );
      fireEvent.press(
        screen.getByTestId(
          `${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}predict_sports_events`,
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

      expect(builderInstance.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          question_type: 'interest',
          selected_interests: expect.arrayContaining([
            'buy_and_sell_crypto',
            'predict_sports_events',
          ]),
          item_count: 2,
          skipped: false,
        }),
      );
    });

    it('navigates to crypto experience questionnaire with onComplete on Continue', async () => {
      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.CRYPTO_EXPERIENCE_QUESTIONNAIRE,
          expect.objectContaining({
            onComplete: mockOnComplete,
          }),
        );
      });
      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('passes accountType to crypto experience when route supplies accountType', async () => {
      mockInterestQuestionnaireRouteParams.accountType = 'imported';

      renderComponent();

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
          ),
        );
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.CRYPTO_EXPERIENCE_QUESTIONNAIRE,
        expect.objectContaining({
          onComplete: mockOnComplete,
          accountType: 'imported',
        }),
      );
    });
  });
});
