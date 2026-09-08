import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StatusBar, StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CardWelcome from './CardWelcome';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MONEY_HOME_CARD_ORIGIN } from '../../hooks/useCardPostAuthRedirect';
import { RiveErrorType } from '@rive-app/react-native';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import { CARDS_ENTRANCE_START_TIMEOUT_MS } from './CardWelcomeCardsAnimation';

// Override the global Rive mock: the shared mock renders RiveView without
// exposing `onError`, which these tests fire to assert the static fallback, and
// they also drive the native view's readiness (`mockViewReady`) because the
// text reveal is sequenced off the entrance actually starting.
interface MockRiveViewProps {
  testID?: string;
  style?: unknown;
  onError?: (error: { message: string; type: RiveErrorType }) => void;
}

let mockLastRiveViewProps: MockRiveViewProps | undefined;
let mockViewReady: boolean;

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual(
    '../../../../../__mocks__/rive-app-react-native',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const MockRiveView = (props: MockRiveViewProps) => {
    mockLastRiveViewProps = props;
    return MockReact.createElement(View, {
      testID: props.testID,
      style: props.style,
    });
  };

  return {
    ...actual,
    RiveView: MockRiveView,
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockViewReady ? { playIfNeeded: jest.fn() } : null,
      setHybridRef: { f: jest.fn() },
    }),
  };
});

const mockUseCardPostAuthRedirect = jest.fn();

jest.mock('../../hooks/useCardPostAuthRedirect', () => ({
  useCardPostAuthRedirect: () => mockUseCardPostAuthRedirect(),
  MONEY_HOME_CARD_ORIGIN: {
    screen: 'Money',
    params: { screen: 'MoneyHome' },
  },
}));

const mockUseCardEducationAnimationState = jest.fn();

jest.mock('./useCardEducationAnimationState', () => ({
  useCardEducationAnimationState: () => mockUseCardEducationAnimationState(),
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

jest.mock(
  '../../../../../animations/onboarding_card_education_v3.riv',
  () => 1,
  { virtual: true },
);

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

const getRiveOnError = () => mockLastRiveViewProps?.onError;

describe('CardWelcome', () => {
  let store: ReturnType<typeof createTestStore>;
  let setBarStyleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockLastRiveViewProps = undefined;
    mockViewReady = true;
    mockUseCardPostAuthRedirect.mockReturnValue(undefined);
    mockUseCardEducationAnimationState.mockReturnValue('static');
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

      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CardWelcomeSelectors.NOT_NOW_BUTTON),
      ).toBeOnTheScreen();
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

  describe('Cards animation states', () => {
    beforeEach(() => {
      store = createTestStore({ cardholderAccounts: [] });
    });

    it("renders neither the Rive animation nor the static image while 'pending'", () => {
      mockUseCardEducationAnimationState.mockReturnValue('pending');

      const { queryByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardWelcomeSelectors.CARD_IMAGE),
      ).not.toBeOnTheScreen();
    });

    it("renders the Rive animation when the state is 'animate'", () => {
      mockUseCardEducationAnimationState.mockReturnValue('animate');

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(
        getByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(CardWelcomeSelectors.CARD_IMAGE),
      ).not.toBeOnTheScreen();
    });

    it("renders the static image when the state is 'static'", () => {
      mockUseCardEducationAnimationState.mockReturnValue('static');

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
      expect(
        queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
      ).not.toBeOnTheScreen();
    });

    it('renders the title and description in every animation state', () => {
      (['pending', 'animate', 'static'] as const).forEach((state) => {
        mockUseCardEducationAnimationState.mockReturnValue(state);

        const { getByTestId, unmount } = render(
          <Provider store={store}>
            <CardWelcome />
          </Provider>,
        );

        expect(
          getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
        ).toBeOnTheScreen();
        expect(
          getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
        ).toBeOnTheScreen();

        unmount();
      });
    });
  });

  describe('Text reveal', () => {
    beforeEach(() => {
      store = createTestStore({ cardholderAccounts: [] });
    });

    it('releases the hidden text reveal style when the cards animation reports a Rive error while animating', () => {
      mockUseCardEducationAnimationState.mockReturnValue('animate');

      const { getByTestId, queryByTestId, UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const onError = getRiveOnError();
      expect(onError).toBeDefined();

      act(() => {
        onError?.({
          message: 'failed to load',
          type: RiveErrorType.MalformedFile,
        });
      });

      const textContainerStyleEntries = UNSAFE_getByType(Animated.View).props
        .style as ViewStyle[];
      const textContainerStyle = StyleSheet.flatten(textContainerStyleEntries);

      expect(textContainerStyle.opacity).not.toBe(0);
      // The error resolves the state to 'static', which attaches neither the
      // hidden style nor the animated reveal style: an empty style array is
      // what proves the copy is not left waiting on a reveal that never runs.
      expect(textContainerStyleEntries.filter(Boolean)).toHaveLength(0);
      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
      expect(
        queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
      ).not.toBeOnTheScreen();
    });

    it('holds the copy hidden and unrevealed while the cards entrance has not started', () => {
      mockUseCardEducationAnimationState.mockReturnValue('animate');
      mockViewReady = false;

      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const textContainerStyleEntries = UNSAFE_getByType(Animated.View).props
        .style as ViewStyle[];

      expect(StyleSheet.flatten(textContainerStyleEntries).opacity).toBe(0);
      // Only the plain hidden style is attached: the reveal is timed from the
      // entrance, and the entrance has not started yet.
      expect(textContainerStyleEntries.filter(Boolean)).toHaveLength(1);
    });

    it('attaches the reveal style once the cards entrance starts', () => {
      mockUseCardEducationAnimationState.mockReturnValue('animate');

      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const textContainerStyleEntries = UNSAFE_getByType(Animated.View).props
        .style as ViewStyle[];

      expect(textContainerStyleEntries.filter(Boolean)).toHaveLength(2);
    });

    it('reveals the copy anyway when the entrance never reports it started', () => {
      jest.useFakeTimers();
      mockUseCardEducationAnimationState.mockReturnValue('animate');
      mockViewReady = false;

      try {
        const { UNSAFE_getByType } = render(
          <Provider store={store}>
            <CardWelcome />
          </Provider>,
        );

        expect(
          (UNSAFE_getByType(Animated.View).props.style as ViewStyle[]).filter(
            Boolean,
          ),
        ).toHaveLength(1);

        act(() => {
          jest.advanceTimersByTime(CARDS_ENTRANCE_START_TIMEOUT_MS);
        });

        expect(
          (UNSAFE_getByType(Animated.View).props.style as ViewStyle[]).filter(
            Boolean,
          ),
        ).toHaveLength(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it("attaches neither the hidden nor the animated reveal style on the first render in 'static' mode", () => {
      mockUseCardEducationAnimationState.mockReturnValue('static');

      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const textContainerStyleEntries = UNSAFE_getByType(Animated.View).props
        .style as ViewStyle[];
      const textContainerStyle = StyleSheet.flatten(textContainerStyleEntries);

      expect(textContainerStyle.opacity).toBeUndefined();
      // An empty style array is the real signal here: a bare (unattached)
      // animated-style handle also flattens to `opacity: undefined`, so only
      // the absence of any truthy entry proves no reveal style was attached.
      expect(textContainerStyleEntries.filter(Boolean)).toHaveLength(0);
    });

    it("hides the text while the animation state is 'pending'", () => {
      mockUseCardEducationAnimationState.mockReturnValue('pending');

      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const textContainerStyle = StyleSheet.flatten(
        UNSAFE_getByType(Animated.View).props.style,
      );

      expect(textContainerStyle.opacity).toBe(0);
    });

    it('keeps the text hidden on the render where the state first transitions from pending to animate', () => {
      mockUseCardEducationAnimationState.mockReturnValue('pending');

      const { rerender, UNSAFE_getByType } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      mockUseCardEducationAnimationState.mockReturnValue('animate');
      rerender(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      const textContainerStyle = StyleSheet.flatten(
        UNSAFE_getByType(Animated.View).props.style,
      );

      expect(textContainerStyle.opacity).toBe(0);
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
