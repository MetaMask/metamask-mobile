import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyVbaHomeCard from './MoneyVbaHomeCard';
import {
  MONEY_VBA_HOME_CARD_CONFIG,
  type MoneyVbaHomeCardVariant,
} from './MoneyVbaHomeCardConfig';
import {
  MONEY_VBA_HOME_CARD_HERO_TEST_IDS,
  MONEY_VBA_HOME_CARD_TEST_IDS,
} from './MoneyVbaHomeCard.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  canOpenPersistedVbaDetails,
  navigateToVbaOnboardingDestination,
  openVbaEntry,
  resolveVbaOnboarding,
} from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  endVbaCufJourney,
  startVbaCufJourney,
} from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import {
  VBA_CUF_END_REASON,
  VBA_CUF_ENTRY_SURFACE,
} from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';

const mockNavigate = jest.fn();
const mockNavigation = { dispatch: jest.fn(), navigate: mockNavigate };

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
    canOpenPersistedVbaDetails: jest.fn(),
    navigateToVbaOnboardingDestination: jest.fn(),
    openVbaEntry: jest.fn(),
    resolveVbaOnboarding: jest.fn(),
  }),
);
jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaCufTrace', () => ({
  endVbaCufJourney: jest.fn(),
  startVbaCufJourney: jest.fn(),
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

// Wraps the shared Nitro Rive mock (`app/__mocks__/rive-app-react-native`) so
// tests can read the RiveView props (runtime names, style, onError) and flip
// the native view's readiness, which gates hiding the static hero art.
let mockRiveViewReady = true;
const mockRiveView = {
  reset: jest.fn(),
  play: jest.fn(),
};

const mockRiveViewProps: {
  current?: {
    artboardName?: string;
    stateMachineName?: string;
    autoPlay?: boolean;
    style?: StyleProp<ViewStyle>;
    onError?: (error: RiveError) => void;
  };
} = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: Record<string, unknown>) => {
    ReactActual.useEffect(() => {
      mockRiveViewProps.current = props;
    });
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockRiveViewReady ? mockRiveView : null,
      setHybridRef: { f: jest.fn() },
    }),
    RiveView: MockRiveView,
  };
});

// Mount counts as the first focus (as on a focused screen); `refocus()`
// replays the latest callback, like tabbing back to the Money screen.
let mockFocusCallback: (() => void) | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => mockNavigation,
    useFocusEffect: (callback: () => void) => {
      mockFocusCallback = callback;
      ReactActual.useEffect(() => {
        callback();
      }, []);
    },
  };
});

const refocus = async () => {
  await act(async () => {
    mockFocusCallback?.();
  });
};

const mockUseReduceMotion = jest.mocked(useReduceMotion);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockNavigateToDestination = jest.mocked(
  navigateToVbaOnboardingDestination,
);
const mockResolve = jest.mocked(resolveVbaOnboarding);
const mockOpenVbaEntry = jest.mocked(openVbaEntry);
const mockCanOpenPersistedVbaDetails = jest.mocked(canOpenPersistedVbaDetails);
const mockEndVbaCufJourney = jest.mocked(endVbaCufJourney);
const mockStartVbaCufJourney = jest.mocked(startVbaCufJourney);
const mockLoggerError = jest.mocked(Logger.error);

const VARIANTS: MoneyVbaHomeCardVariant[] = [
  'get_started',
  'account_is_ready',
  'kyc_pending',
  'finish_verification',
  'kyc_decision',
];

/** Variants whose CTA opens onboarding; KYC_PENDING's CTA is disabled. */
const CTA_VARIANTS = VARIANTS.filter(
  (variant) => variant !== 'kyc_pending' || variant !== 'kyc_decision',
);

/**
 * Literal per-variant expectations, independent of `MONEY_VBA_HOME_CARD_CONFIG`,
 * so the tests pin the contract instead of echoing the config back.
 */
const VARIANT_EXPECTATIONS: Record<
  MoneyVbaHomeCardVariant,
  {
    source: string;
    i18nPrefix: string;
    /** Undefined for the disabled KYC_PENDING CTA. */
    buttonIntent?: MONEY_BUTTON_INTENTS;
    componentName: COMPONENT_NAMES;
  }
> = {
  get_started: {
    componentName: COMPONENT_NAMES.MONEY_VBA_GET_STARTED_CARD,
    source: 'vba-home-card-get-started',
    i18nPrefix: 'money.vba_home_card.get_started',
    buttonIntent: MONEY_BUTTON_INTENTS.GET_STARTED,
  },
  account_is_ready: {
    componentName: COMPONENT_NAMES.MONEY_VBA_ACCOUNT_READY_CARD,
    source: 'vba-home-card-account-is-ready',
    i18nPrefix: 'money.vba_home_card.account_is_ready',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
  },
  kyc_pending: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_PENDING_CARD,
    source: 'vba-home-card-kyc-pending',
    i18nPrefix: 'money.vba_home_card.kyc_pending',
  },
  finish_verification: {
    componentName: COMPONENT_NAMES.MONEY_VBA_FINISH_VERIFICATION_CARD,
    source: 'vba-home-card-finish-verification',
    i18nPrefix: 'money.vba_home_card.finish_verification',
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
  },
  kyc_decision: {
    componentName: COMPONENT_NAMES.MONEY_VBA_KYC_DECISION_CARD,
    source: 'vba-home-card-kyc-decision',
    i18nPrefix: 'money.vba_home_card.kyc_decision',
    buttonIntent: MONEY_BUTTON_INTENTS.LEARN_MORE,
  },
};

describe('MoneyVbaHomeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolve.mockResolvedValue({
      status: 'ready',
      destinationId: 'kycPending',
      snapshot: { ...EMPTY_VBA_ONBOARDING_SNAPSHOT },
    });
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseReduceMotion.mockReturnValue(false);
    mockRiveViewReady = true;
    mockRiveViewProps.current = undefined;
    mockFocusCallback = undefined;
    mockRiveView.reset.mockResolvedValue(undefined);
    mockRiveView.play.mockResolvedValue(undefined);
  });

  it.each(VARIANTS)('renders the %s copy, CTA, and test ids', (variant) => {
    const expectations = VARIANT_EXPECTATIONS[variant];
    const testIds = MONEY_VBA_HOME_CARD_TEST_IDS[variant];

    const { getByTestId } = render(<MoneyVbaHomeCard variant={variant} />);

    expect(getByTestId(testIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(testIds.TITLE)).toHaveTextContent(
      strings(`${expectations.i18nPrefix}.title`),
    );
    expect(getByTestId(testIds.DESCRIPTION)).toHaveTextContent(
      strings(`${expectations.i18nPrefix}.description`),
    );
    expect(getByTestId(testIds.CTA_BUTTON)).toHaveTextContent(
      strings(`${expectations.i18nPrefix}.cta`),
    );
  });

  it.each(VARIANTS)('fires the card-shown event once for %s', (variant) => {
    const { rerender } = render(<MoneyVbaHomeCard variant={variant} />);
    rerender(<MoneyVbaHomeCard variant={variant} />);

    expect(mockUseMoneyAnalytics).toHaveBeenCalledWith({
      screen_name: SCREEN_NAMES.MONEY_HOME,
      component_name: VARIANT_EXPECTATIONS[variant].componentName,
    });
    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it.each(CTA_VARIANTS)(
    'hydrates on the card and opens the resolved destination for %s',
    async (variant) => {
      const expectations = VARIANT_EXPECTATIONS[variant];

      const { getByTestId } = render(<MoneyVbaHomeCard variant={variant} />);

      fireEvent.press(
        getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS[variant].CTA_BUTTON),
      );

      expect(mockTrackButtonClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          button_type: MONEY_BUTTON_TYPES.TEXT,
          button_intent: expectations.buttonIntent,
          label_key: `${expectations.i18nPrefix}.cta`,
          redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
        }),
      );
      expect(mockResolve).toHaveBeenCalledWith(expectations.source);
      await waitFor(() => {
        expect(mockNavigateToDestination).toHaveBeenCalledWith(
          mockNavigation,
          'kycPending',
          EMPTY_VBA_ONBOARDING_SNAPSHOT,
        );
      });
      expect(mockStartVbaCufJourney).toHaveBeenCalledWith(
        VBA_CUF_ENTRY_SURFACE.HOME_CARD,
      );
      expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
    },
  );

  it('renders the kyc_pending CTA disabled, with no loader', () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_pending" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CTA_BUTTON,
    );

    expect(cta).toHaveTextContent(
      strings('money.vba_home_card.kyc_pending.cta'),
    );
    expect(cta).toBeDisabled();
    // ButtonBase only sets `busy` while its loading spinner shows.
    expect(cta.props.accessibilityState).toEqual({ disabled: true });
  });

  it('ignores presses on the disabled kyc_pending CTA', () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_pending" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CTA_BUTTON),
    );

    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
    expect(mockStartVbaCufJourney).not.toHaveBeenCalled();
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockNavigateToDestination).not.toHaveBeenCalled();
  });

  it('tracks the CTA click before starting the VBA journey', () => {
    mockResolve.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
        () => undefined,
      ),
    );
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
    );

    expect(mockTrackButtonClicked.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartVbaCufJourney.mock.invocationCallOrder[0],
    );
  });

  it('opens persisted account details directly and stays tappable afterward', () => {
    mockCanOpenPersistedVbaDetails.mockReturnValue(true);
    const { getByTestId } = render(
      <MoneyVbaHomeCard variant="account_is_ready" />,
    );
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready.CTA_BUTTON,
    );

    fireEvent.press(cta);
    fireEvent.press(cta);

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockOpenVbaEntry).toHaveBeenCalledTimes(2);
    expect(mockOpenVbaEntry).toHaveBeenCalledWith(mockNavigation, {
      source: 'vba-home-card-account-is-ready',
    });
    expect(cta.props.accessibilityState?.busy).toBeFalsy();
  });

  it('keeps the CTA busy while onboarding status resolves', () => {
    mockResolve.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
        () => undefined,
      ),
    );
    const { getByTestId } = render(
      <MoneyVbaHomeCard variant="finish_verification" />,
    );
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.finish_verification.CTA_BUTTON,
    );

    fireEvent.press(cta);

    expect(cta.props.accessibilityState?.busy).toBe(true);
  });

  it('ignores a repeat CTA tap while the first is still presenting', () => {
    mockResolve.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
        () => undefined,
      ),
    );
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON,
    );

    fireEvent.press(cta);
    fireEvent.press(cta);

    expect(mockResolve).toHaveBeenCalledTimes(1);
    expect(mockTrackButtonClicked).toHaveBeenCalledTimes(1);
  });

  it('opens the error destination when onboarding cannot resolve', async () => {
    mockResolve.mockResolvedValue({ status: 'error' });
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
    );

    await waitFor(() => {
      expect(mockNavigateToDestination).toHaveBeenCalledWith(
        mockNavigation,
        'error',
      );
    });
    expect(mockEndVbaCufJourney).toHaveBeenCalledWith(
      false,
      VBA_CUF_END_REASON.ERROR,
    );
  });

  it('logs rejected onboarding resolution and opens the error destination', async () => {
    const error = new Error('hydrate failed');
    mockResolve.mockRejectedValue(error);
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
    );

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(error, expect.any(Object));
      expect(mockNavigateToDestination).toHaveBeenCalledWith(
        mockNavigation,
        'error',
      );
    });
    expect(mockEndVbaCufJourney).toHaveBeenCalledWith(
      false,
      VBA_CUF_END_REASON.ERROR,
    );
  });

  it('does not navigate after the card unmounts during onboarding resolution', async () => {
    let resolveOnboarding!: (
      result: Awaited<ReturnType<typeof resolveVbaOnboarding>>,
    ) => void;
    mockResolve.mockReturnValue(
      new Promise<Awaited<ReturnType<typeof resolveVbaOnboarding>>>(
        (resolve) => {
          resolveOnboarding = resolve;
        },
      ),
    );
    const { getByTestId, unmount } = render(
      <MoneyVbaHomeCard variant="get_started" />,
    );
    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
    );

    unmount();
    await act(async () => {
      resolveOnboarding({
        status: 'ready',
        destinationId: 'kycPending',
        snapshot: { ...EMPTY_VBA_ONBOARDING_SNAPSHOT },
      });
    });

    expect(mockNavigateToDestination).not.toHaveBeenCalled();
  });

  it('opens the MetaMask support article when Learn more is pressed on kyc_decision', () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_decision" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CTA_BUTTON),
    );

    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.LEARN_MORE,
        label_key: 'money.vba_home_card.kyc_decision.cta',
        redirect_target: MONEY_URLS.METAMASK_SUPPORT,
      }),
    );
    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
    );
    expect(mockOpenVbaEntry).not.toHaveBeenCalled();
    expect(mockStartVbaCufJourney).not.toHaveBeenCalled();

    const [openSupportUrl] = mockOpenSupportWithConsent.mock.calls[0] as [
      (url: string) => void,
    ];
    const consentedUrl = `${METAMASK_SUPPORT_URL}&metamask_version=1.0.0`;
    openSupportUrl(consentedUrl);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: consentedUrl,
        timestamp: expect.any(Number),
        fromMoney: true,
      },
    });
  });

  it('hides the kyc_decision card when Dismiss is pressed', () => {
    const testIds = MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision;
    const { getByTestId, queryByTestId } = render(
      <MoneyVbaHomeCard variant="kyc_decision" />,
    );

    fireEvent.press(getByTestId(testIds.DISMISS_BUTTON as string));

    expect(queryByTestId(testIds.CONTAINER)).toBeNull();
    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.DISMISS,
        label_key: 'money.vba_home_card.kyc_decision.dismiss',
      }),
    );
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockOpenVbaEntry).not.toHaveBeenCalled();
    expect(mockOpenSupportWithConsent).not.toHaveBeenCalled();
  });

  it('offers Dismiss only on the kyc_decision card', () => {
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_decision.opensSupportArticle).toBe(
      true,
    );
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_decision.isDismissible).toBe(true);
    const otherVariants = VARIANTS.filter(
      (variant) => variant !== 'kyc_decision',
    );
    otherVariants.forEach((variant) => {
      expect(MONEY_VBA_HOME_CARD_CONFIG[variant].isDismissible).toBeUndefined();
      expect(
        MONEY_VBA_HOME_CARD_CONFIG[variant].opensSupportArticle,
      ).toBeUndefined();
    });
  });

  it.each(VARIANTS.filter((variant) => variant !== 'kyc_decision'))(
    'renders no Dismiss button for %s',
    (variant) => {
      const { queryByText } = render(<MoneyVbaHomeCard variant={variant} />);

      expect(
        queryByText(strings('money.vba_home_card.kyc_decision.dismiss')),
      ).toBeNull();
    },
  );

  it('disables the CTA only on the kyc_pending card', () => {
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_pending.cta).toEqual({
      isDisabled: true,
    });
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_pending.source).toBe(
      VARIANT_EXPECTATIONS.kyc_pending.source,
    );

    CTA_VARIANTS.forEach((variant) => {
      const { cta } = MONEY_VBA_HOME_CARD_CONFIG[variant];
      expect(cta.isDisabled).toBeFalsy();
      expect(cta).toEqual(
        expect.objectContaining({
          buttonIntent: VARIANT_EXPECTATIONS[variant].buttonIntent,
          className: expect.any(String),
          textClassName: expect.any(String),
        }),
      );
    });
  });

  describe('Rive hero', () => {
    it('leaves the first play to autoplay on the initial focus', () => {
      render(<MoneyVbaHomeCard variant="kyc_pending" />);

      expect(mockRiveView.reset).not.toHaveBeenCalled();
      expect(mockRiveView.play).not.toHaveBeenCalled();
    });

    it('replays from the start each time the screen regains focus', async () => {
      render(<MoneyVbaHomeCard variant="kyc_pending" />);

      await refocus();

      expect(mockRiveView.reset).toHaveBeenCalledTimes(1);
      expect(mockRiveView.play).toHaveBeenCalledTimes(1);
      expect(mockRiveView.reset.mock.invocationCallOrder[0]).toBeLessThan(
        mockRiveView.play.mock.invocationCallOrder[0],
      );

      await refocus();

      expect(mockRiveView.reset).toHaveBeenCalledTimes(2);
      expect(mockRiveView.play).toHaveBeenCalledTimes(2);
    });

    it('does not replay on refocus when Reduce Motion is on', async () => {
      mockUseReduceMotion.mockReturnValue(true);
      render(<MoneyVbaHomeCard variant="kyc_pending" />);

      await refocus();

      expect(mockRiveView.reset).not.toHaveBeenCalled();
      expect(mockRiveView.play).not.toHaveBeenCalled();
    });

    it('does not replay on refocus before the Rive view is ready', async () => {
      mockRiveViewReady = false;
      render(<MoneyVbaHomeCard variant="kyc_pending" />);

      await refocus();

      expect(mockRiveView.reset).not.toHaveBeenCalled();
      expect(mockRiveView.play).not.toHaveBeenCalled();
    });

    it('logs and skips play when a replay fails', async () => {
      mockRiveView.reset.mockRejectedValue(new Error('view detached'));
      render(<MoneyVbaHomeCard variant="kyc_pending" />);

      await refocus();

      expect(mockRiveView.play).not.toHaveBeenCalled();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'view detached' }),
        expect.objectContaining({
          tags: { feature: 'money-home' },
          context: expect.objectContaining({
            name: 'MoneyVbaHomeCardHeroAnimation',
          }),
        }),
      );
    });

    it('plays the Verify Identity state machine on the kyc_pending card', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyVbaHomeCard variant="kyc_pending" />,
      );

      expect(
        getByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.RIVE),
      ).toBeOnTheScreen();
      expect(mockRiveViewProps.current).toMatchObject({
        artboardName: 'Verify Identity',
        stateMachineName: 'Verify Identity',
        autoPlay: true,
      });
      expect(
        StyleSheet.flatten(mockRiveViewProps.current?.style),
      ).toMatchObject({ width: 106.5, height: 88 });
      expect(
        queryByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.FALLBACK),
      ).toBeNull();
    });

    it('keeps the static art visible until the Rive view is ready', () => {
      mockRiveViewReady = false;

      const { getByTestId } = render(
        <MoneyVbaHomeCard variant="kyc_pending" />,
      );

      expect(
        getByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.FALLBACK),
      ).toBeOnTheScreen();
      expect(
        StyleSheet.flatten(mockRiveViewProps.current?.style),
      ).toMatchObject({ opacity: 0 });
    });

    it('shows only the static art when Reduce Motion is on', () => {
      mockUseReduceMotion.mockReturnValue(true);

      const { getByTestId, queryByTestId } = render(
        <MoneyVbaHomeCard variant="kyc_pending" />,
      );

      expect(
        getByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.FALLBACK),
      ).toBeOnTheScreen();
      expect(queryByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.RIVE)).toBeNull();
    });

    it('falls back to the static art and logs when Rive errors', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyVbaHomeCard variant="kyc_pending" />,
      );

      act(() => {
        mockRiveViewProps.current?.onError?.({
          message: 'bad artboard',
          type: RiveErrorType.IncorrectArtboardName,
        });
      });

      expect(
        getByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.FALLBACK),
      ).toBeOnTheScreen();
      expect(queryByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.RIVE)).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'bad artboard' }),
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'MoneyVbaHomeCardHeroAnimation',
          }),
        }),
      );
    });

    it.each(VARIANTS.filter((variant) => variant !== 'kyc_pending'))(
      'keeps the static hero art on the %s card',
      (variant) => {
        const { queryByTestId } = render(
          <MoneyVbaHomeCard variant={variant} />,
        );

        expect(
          queryByTestId(MONEY_VBA_HOME_CARD_HERO_TEST_IDS.RIVE),
        ).toBeNull();
        expect(
          MONEY_VBA_HOME_CARD_CONFIG[variant].heroAnimation,
        ).toBeUndefined();
      },
    );
  });
});
