import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CardWelcome from './CardWelcome';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MONEY_HOME_CARD_ORIGIN } from '../../hooks/useCardPostAuthRedirect';

const mockUseCardPostAuthRedirect = jest.fn();

jest.mock('../../hooks/useCardPostAuthRedirect', () => ({
  useCardPostAuthRedirect: () => mockUseCardPostAuthRedirect(),
  MONEY_HOME_CARD_ORIGIN: {
    screen: 'Money',
    params: { screen: 'MoneyHome' },
  },
}));

// Mocks
type TransitionEndHandler = (event?: { data?: { closing?: boolean } }) => void;

interface MockNavigator {
  addListener: jest.Mock<() => void, [string, TransitionEndHandler]>;
  getParent: () => MockNavigator | undefined;
}

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn<() => void, [string, TransitionEndHandler]>(
  () => jest.fn(),
);
const mockGetParent = jest.fn<MockNavigator | undefined, []>(() => undefined);
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require('react');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      addListener: mockAddListener,
      getParent: mockGetParent,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.card_onboarding.title': 'Enable MetaMask Card features',
      'card.card_onboarding.description':
        'Change your spending token and network by signing in with your Crypto Life email and password.',
      'card.card_onboarding.apply_now_button': 'Sign in',
      'predict.gtm_content.not_now': 'Not now',
    };
    return map[key] || key;
  },
}));

jest.mock('../../../../../images/stacked-cards.png', () => 1);

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
  };
});

const createTestStore = (
  initialState: { cardholderAccounts?: string[] } = {},
) =>
  configureStore({
    reducer: {
      engine: (
        state = {
          backgroundState: {
            CardController: {
              cardholderAccounts: initialState.cardholderAccounts ?? [],
            },
          },
        },
      ) => state,
    },
  });

describe('CardWelcome', () => {
  let store: ReturnType<typeof createTestStore>;
  let setBarStyleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardPostAuthRedirect.mockReturnValue(undefined);
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockAddListener.mockClear();
    mockAddListener.mockImplementation(() => jest.fn());
    mockGetParent.mockClear();
    mockGetParent.mockReturnValue(undefined);
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    setBarStyleSpy = jest
      .spyOn(StatusBar, 'setBarStyle')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    setBarStyleSpy.mockRestore();
  });

  /**
   * Returns the `transitionEnd` handler registered against the first
   * navigator via `addListener`.
   */
  const getTransitionEndHandler = (): TransitionEndHandler => {
    const call = mockAddListener.mock.calls.find(
      ([eventType]) => eventType === 'transitionEnd',
    );
    return call?.[1] as TransitionEndHandler;
  };

  describe('Render', () => {
    beforeEach(() => {
      store = createTestStore({ cardholderAccounts: [] });
    });

    it('renders required UI elements', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toBeTruthy();
      expect(
        getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeTruthy();
      expect(getByTestId(CardWelcomeSelectors.NOT_NOW_BUTTON)).toBeTruthy();
    });

    it('displays correct title and description', () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toHaveTextContent(strings('card.card_onboarding.title'));
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toHaveTextContent(strings('card.card_onboarding.description'));
    });

    it('tracks view event on mount', () => {
      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('navigates back when "Not Now" is pressed', () => {
      store = createTestStore();
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.NOT_NOW_BUTTON));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Navigation Flow', () => {
    it('navigates to onboarding root when verify account button pressed (Non-cardholder)', () => {
      store = createTestStore({ cardholderAccounts: [] });
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.ONBOARDING.ROOT,
        undefined,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
    });

    it('navigates to authentication when verify account button pressed (Cardholder)', () => {
      store = createTestStore({
        cardholderAccounts: ['0x1234567890abcdef'],
      });
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CARD.AUTHENTICATION,
        undefined,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
    });

    it('forwards postAuthRedirect to onboarding when opened from Money (non-cardholder)', () => {
      mockUseCardPostAuthRedirect.mockReturnValue(MONEY_HOME_CARD_ORIGIN);
      store = createTestStore({ cardholderAccounts: [] });
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ONBOARDING.ROOT, {
        postAuthRedirect: MONEY_HOME_CARD_ORIGIN,
      });
    });

    it('forwards postAuthRedirect to authentication when opened from Money (cardholder)', () => {
      mockUseCardPostAuthRedirect.mockReturnValue(MONEY_HOME_CARD_ORIGIN);
      store = createTestStore({
        cardholderAccounts: ['0x1234567890abcdef'],
      });
      const { getByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      fireEvent.press(getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
        postAuthRedirect: MONEY_HOME_CARD_ORIGIN,
      });
    });
  });

  describe('Status bar handling', () => {
    beforeEach(() => {
      store = createTestStore();
    });

    it('applies light status bar and registers a transitionEnd listener on focus', () => {
      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
      expect(mockAddListener).toHaveBeenCalledWith(
        'transitionEnd',
        expect.any(Function),
      );
    });

    it('reapplies the light status bar when a non-closing transition ends', () => {
      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const handleTransitionEnd = getTransitionEndHandler();
      setBarStyleSpy.mockClear();

      handleTransitionEnd({ data: { closing: false } });

      expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
    });

    it('reapplies the light status bar when transition event has no data', () => {
      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const handleTransitionEnd = getTransitionEndHandler();
      setBarStyleSpy.mockClear();

      handleTransitionEnd();

      expect(setBarStyleSpy).toHaveBeenCalledWith('light-content', true);
    });

    it('does not reapply the light status bar when the transition is closing', () => {
      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const handleTransitionEnd = getTransitionEndHandler();
      setBarStyleSpy.mockClear();

      handleTransitionEnd({ data: { closing: true } });

      expect(setBarStyleSpy).not.toHaveBeenCalled();
    });

    it('registers listeners on parent navigators as well', () => {
      const parentAddListener = jest.fn<
        () => void,
        [string, TransitionEndHandler]
      >(() => jest.fn());
      mockGetParent.mockReturnValueOnce({
        addListener: parentAddListener,
        getParent: () => undefined,
      });

      render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(mockAddListener).toHaveBeenCalledWith(
        'transitionEnd',
        expect.any(Function),
      );
      expect(parentAddListener).toHaveBeenCalledWith(
        'transitionEnd',
        expect.any(Function),
      );
    });

    it('unsubscribes listeners and resets the status bar on blur', () => {
      const unsubscribe = jest.fn();
      mockAddListener.mockImplementation(() => unsubscribe);

      const { unmount } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      setBarStyleSpy.mockClear();
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
      // mockTheme.themeAppearance is 'light', so the bar resets to dark-content.
      expect(setBarStyleSpy).toHaveBeenCalledWith('dark-content', true);
    });
  });
});
