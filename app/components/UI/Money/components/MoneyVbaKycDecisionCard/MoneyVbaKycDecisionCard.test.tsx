import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyVbaKycDecisionCard, {
  VBA_KYC_DECISION_CARD_SOURCE,
} from './MoneyVbaKycDecisionCard';
import { MoneyVbaKycDecisionCardTestIds } from './MoneyVbaKycDecisionCard.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useOpenVbaOnboarding } from '../../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting';
import {
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { strings } from '../../../../../../locales/i18n';

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

const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);

describe('MoneyVbaKycDecisionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseOpenVbaOnboarding.mockReturnValue(mockOpenVbaOnboarding);
  });

  it('renders title, description, and CTA', () => {
    const { getByTestId } = render(<MoneyVbaKycDecisionCard />);

    expect(
      getByTestId(MoneyVbaKycDecisionCardTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyVbaKycDecisionCardTestIds.TITLE),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_decision.title'));
    expect(
      getByTestId(MoneyVbaKycDecisionCardTestIds.DESCRIPTION),
    ).toHaveTextContent(
      strings('money.vba_home_card.kyc_decision.description'),
    );
    expect(
      getByTestId(MoneyVbaKycDecisionCardTestIds.CTA_BUTTON),
    ).toHaveTextContent(strings('money.vba_home_card.kyc_decision.cta'));
  });

  it('opens VBA onboarding with the card source', () => {
    mockUseOpenVbaOnboarding.mockClear();
    render(<MoneyVbaKycDecisionCard />);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(
      VBA_KYC_DECISION_CARD_SOURCE,
    );
  });

  it('fires the card-shown event once on mount', () => {
    const { rerender } = render(<MoneyVbaKycDecisionCard />);
    rerender(<MoneyVbaKycDecisionCard />);

    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it('fires the CTA-tap event and opens VBA onboarding on press', () => {
    const { getByTestId } = render(<MoneyVbaKycDecisionCard />);

    fireEvent.press(getByTestId(MoneyVbaKycDecisionCardTestIds.CTA_BUTTON));

    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        label_key: 'money.vba_home_card.kyc_decision.cta',
        redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
      }),
    );
    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(1);
  });
});
