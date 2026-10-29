import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import MoneyVbaHomeCard from './MoneyVbaHomeCard';
import {
  MONEY_VBA_HOME_CARD_CONFIG,
  type MoneyVbaHomeCardVariant,
} from './MoneyVbaHomeCardConfig';
import { MONEY_VBA_HOME_CARD_TEST_IDS } from './MoneyVbaHomeCard.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();
const mockOpenVbaOnboarding = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
    useOpenVbaOnboarding: jest.fn(),
  }),
);

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
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
    mockOpenVbaOnboarding.mockResolvedValue(undefined);
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseOpenVbaOnboarding.mockReturnValue(mockOpenVbaOnboarding);
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

  it.each(VARIANTS)('opens VBA onboarding with the %s source', (variant) => {
    render(<MoneyVbaHomeCard variant={variant} />);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(
      VARIANT_EXPECTATIONS[variant].source,
    );
  });

  it.each(VARIANTS)(
    'fires the CTA-tap event and opens VBA onboarding for %s',
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
      expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(1);
    },
  );

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
    expect(mockOpenVbaOnboarding).not.toHaveBeenCalled();
  });

  it('logs to Logger.error when opening VBA onboarding rejects', async () => {
    const failure = new Error('open failed');
    mockOpenVbaOnboarding.mockRejectedValue(failure);

    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);

    await act(async () => {
      fireEvent.press(
        getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON),
      );
    });

    expect(Logger.error).toHaveBeenCalledWith(failure, {
      tags: { feature: 'money-home' },
      context: {
        name: 'MoneyVbaHomeCard',
        data: { variant: 'get_started', step: 'openVbaOnboarding' },
      },
    });
  });

  it('shows a busy CTA and ignores repeated taps while opening', () => {
    // Note: this pins the isLoading-disabled mechanism — RN Pressability
    // short-circuits presses on a disabled button, so the second press never
    // reaches onPress. The `isOpening` guard in handleCtaPress is
    // defense-in-depth for non-disabled entry points.
    mockOpenVbaOnboarding.mockImplementation(
      () =>
        new Promise<void>(() => {
          /* never settles: the hydrate is in flight */
        }),
    );

    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON,
    );

    fireEvent.press(cta);
    fireEvent.press(cta);

    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(1);
    expect(cta.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, busy: true }),
    );
  });

  it('re-enables the CTA once opening settles', async () => {
    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON,
    );

    await act(async () => {
      fireEvent.press(cta);
    });
    await act(async () => {
      fireEvent.press(cta);
    });

    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(2);
    expect(cta.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
    expect(cta.props.accessibilityState?.busy).toBeFalsy();
  });

  it('re-enables the CTA after a rejected open and allows retry', async () => {
    mockOpenVbaOnboarding.mockRejectedValueOnce(new Error('open failed'));

    const { getByTestId } = render(<MoneyVbaHomeCard variant="get_started" />);
    const cta = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.get_started.CTA_BUTTON,
    );

    await act(async () => {
      fireEvent.press(cta);
    });

    expect(cta.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
    expect(cta.props.accessibilityState?.busy).toBeFalsy();

    await act(async () => {
      fireEvent.press(cta);
    });

    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(2);
  });

  it('ignores Dismiss while an open is in flight', () => {
    mockOpenVbaOnboarding.mockImplementation(
      () =>
        new Promise<void>(() => {
          /* never settles: the hydrate is in flight */
        }),
    );

    const { getByTestId } = render(<MoneyVbaHomeCard variant="kyc_decision" />);
    fireEvent.press(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CTA_BUTTON),
    );

    const dismiss = getByTestId(
      MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.DISMISS_BUTTON as string,
    );
    fireEvent.press(dismiss);

    expect(
      getByTestId(MONEY_VBA_HOME_CARD_TEST_IDS.kyc_decision.CONTAINER),
    ).toBeOnTheScreen();
    expect(mockTrackButtonClicked).not.toHaveBeenCalledWith(
      expect.objectContaining({ button_intent: MONEY_BUTTON_INTENTS.DISMISS }),
    );
    expect(dismiss.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
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

  it('shows the spinner icon only on the kyc_pending CTA', () => {
    expect(MONEY_VBA_HOME_CARD_CONFIG.kyc_pending.ctaStartIconName).toBe(
      IconName.Loading,
    );
    const otherVariants = VARIANTS.filter(
      (variant) => variant !== 'kyc_pending',
    );
    otherVariants.forEach((variant) => {
      expect(
        MONEY_VBA_HOME_CARD_CONFIG[variant].ctaStartIconName,
      ).toBeUndefined();
    });
  });
});
