import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MoneyVbaHomeCard from './MoneyVbaHomeCard';
import {
  MONEY_VBA_HOME_CARD_CONFIG,
  type MoneyVbaHomeCardVariant,
} from './MoneyVbaHomeCardConfig';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from './MoneyVbaHomeCard.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
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
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

const mockNavigation = { dispatch: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
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

const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockNavigateToDestination = jest.mocked(
  navigateToVbaOnboardingDestination,
);
const mockResolve = jest.mocked(resolveVbaOnboarding);
const mockOpenVbaEntry = jest.mocked(openVbaEntry);
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

/**
 * Literal per-variant expectations, independent of `MONEY_VBA_HOME_CARD_CONFIG`,
 * so the tests pin the contract instead of echoing the config back.
 */
const VARIANT_EXPECTATIONS: Record<
  MoneyVbaHomeCardVariant,
  {
    source: string;
    i18nPrefix: string;
    buttonIntent: MONEY_BUTTON_INTENTS;
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
    buttonIntent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
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
    mockResolve.mockResolvedValue({
      status: 'ready',
      destinationId: 'kycPending',
      snapshot: { ...EMPTY_VBA_ONBOARDING_SNAPSHOT },
    });
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
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
    expect(getByTestId(testIds.CTA_BUTTON)).toBeOnTheScreen();
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

  it.each(
    VARIANTS.filter(
      (variant) => variant !== 'kyc_pending' && variant !== 'account_is_ready',
    ),
  )(
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
    },
  );

  it('opens the pending screen immediately from the kyc_pending card', () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_pending" />);

    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CTA_BUTTON),
    );

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockNavigateToDestination).toHaveBeenCalledWith(
      mockNavigation,
      'kycPending',
    );
    expect(mockStartVbaCufJourney).toHaveBeenCalledWith(
      VBA_CUF_ENTRY_SURFACE.HOME_CARD,
    );
  });

  it('opens account details directly from the account_is_ready card, without the hydrate round trip', () => {
    const { getByTestId } = render(
      <MoneyVbaHomeCard variant="account_is_ready" />,
    );
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.account_is_ready.CTA_BUTTON,
    );

    fireEvent.press(cta);

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockOpenVbaEntry).toHaveBeenCalledWith(mockNavigation, {
      source: 'vba-home-card-account-is-ready',
    });
    expect(mockStartVbaCufJourney).toHaveBeenCalledWith(
      VBA_CUF_ENTRY_SURFACE.HOME_CARD,
    );
    // The fast path navigates synchronously, so the CTA never shows busy.
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

  it('shows an animated spinner only on the idle kyc_pending CTA', () => {
    const pendingTestId = `${MONEY_VBA_HOME_CARD_TEST_IDS.kyc_pending.CTA_BUTTON}-spinner`;
    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_pending" />);
    expect(
      getByTestId(pendingTestId, { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    const otherVariants = VARIANTS.filter(
      (variant) => variant !== 'kyc_pending',
    );
    otherVariants.forEach((variant) => {
      const { queryByTestId } = render(<MoneyVbaHomeCard variant={variant} />);
      expect(queryByTestId(pendingTestId)).toBeNull();
    });
  });
});
