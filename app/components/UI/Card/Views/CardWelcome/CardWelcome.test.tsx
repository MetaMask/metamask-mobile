import React from 'react';
import { lightTheme } from '@metamask/design-tokens';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StatusBar } from 'react-native';
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

// Override the global Rive mock: the shared mock renders RiveView without
// exposing `onError`, which these tests fire to assert the static fallback, and
// they also drive the native view's readiness (`mockViewReady`).
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

const mockGetHardwareTier = jest.fn(
  (): 'LOW' | 'MID' | 'HIGH' | null => 'HIGH',
);
const mockUseNetworkTier = jest.fn(
  (): 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null => 'WIFI',
);

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockUseNetworkTier(),
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
  __esModule: true,
  default: { locale: 'en' },
  I18nEvents: new (jest.requireActual('events').EventEmitter)(),
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
  initialState: {
    cardholderAccounts?: string[];
    signInLink?: Record<string, unknown> | null;
  } = {},
) =>
  configureStore({
    reducer: {
      engine: (
        state = {
          backgroundState: {
            CardController: {
              cardholderAccounts: initialState.cardholderAccounts ?? [],
              signInLink: initialState.signInLink ?? null,
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
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseNetworkTier.mockReturnValue('WIFI');
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
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT),
      ).toHaveStyle({ color: lightTheme.colors.accent02.light });
      expect(
        getByTestId(CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT),
      ).toHaveStyle({ color: lightTheme.colors.accent02.light });
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

    it('renders the static image on low-memory hardware while animation is enabled', () => {
      mockGetHardwareTier.mockReturnValue('LOW');
      mockUseNetworkTier.mockReturnValue('WIFI');
      mockUseCardEducationAnimationState.mockReturnValue('animate');

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

  describe('Rive fallback', () => {
    it('swaps to the static card image when the cards animation reports a Rive error', () => {
      store = createTestStore({ cardholderAccounts: [] });
      mockUseCardEducationAnimationState.mockReturnValue('animate');

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <CardWelcome />
        </Provider>,
      );

      act(() => {
        getRiveOnError()?.({
          message: 'failed to load',
          type: RiveErrorType.MalformedFile,
        });
      });

      expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
      expect(
        queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
      ).not.toBeOnTheScreen();
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

    it('navigates to authentication when a sign-in link exists (non-cardholder)', () => {
      store = createTestStore({
        cardholderAccounts: [],
        signInLink: {
          providerId: 'immersve',
          status: 'linked',
          address: '0xabc',
          updatedAt: Date.now(),
        },
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
