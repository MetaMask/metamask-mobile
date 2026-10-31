import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
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
import { openVbaEntry } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import { startVbaCufJourney } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTrace';
import { VBA_CUF_ENTRY_SURFACE } from '../../../Ramp/Views/VirtualBankAccount/vbaCufTags';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

const mockNavigation = { dispatch: jest.fn() };

const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
    openVbaEntry: jest.fn(),
  }),
);
jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaCufTrace', () => ({
  startVbaCufJourney: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
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
const mockOpenVbaEntry = jest.mocked(openVbaEntry);
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
const CTA_VARIANTS = VARIANTS.filter((variant) => variant !== 'kyc_pending');

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
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
  },
};

describe('MoneyVbaHomeCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    'fires the CTA-tap event and routes straight to the loading screen for %s',
    (variant) => {
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
      expect(mockOpenVbaEntry).toHaveBeenCalledWith(mockNavigation, {
        source: expectations.source,
      });
      expect(mockStartVbaCufJourney).toHaveBeenCalledWith(
        VBA_CUF_ENTRY_SURFACE.HOME_CARD,
      );
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
    expect(mockOpenAsOnlyOnboardingRoute).not.toHaveBeenCalled();
  });

  it('does not put the CTA into a busy state', () => {
    const { getByTestId } = render(
      <MoneyVbaHomeCard variant="finish_verification" />,
    );
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.finish_verification.CTA_BUTTON,
    );

    fireEvent.press(cta);

    expect(cta.props.accessibilityState?.busy).toBeFalsy();
  });

  it('ignores a repeat CTA tap while the first is still presenting', () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON,
    );

    fireEvent.press(cta);
    fireEvent.press(cta);

    expect(mockOpenVbaEntry).toHaveBeenCalledTimes(1);
    expect(mockTrackButtonClicked).toHaveBeenCalledTimes(1);
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
    expect(mockOpenVbaEntry).not.toHaveBeenCalled();
  });

  it('offers Dismiss only on the kyc_decision card', () => {
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_decision.isDismissible).toBe(true);
    const otherVariants = VARIANTS.filter(
      (variant) => variant !== 'kyc_decision',
    );
    otherVariants.forEach((variant) => {
      expect(MONEY_VBA_HOME_CARD_CONFIG[variant].isDismissible).toBeUndefined();
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
