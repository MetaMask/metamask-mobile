import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyVbaGetStartedCard, {
  VBA_GET_STARTED_CARD_SOURCE,
} from './MoneyVbaGetStartedCard';
import { MoneyVbaGetStartedCardTestIds } from './MoneyVbaGetStartedCard.testIds';
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

describe('MoneyVbaGetStartedCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseOpenVbaOnboarding.mockReturnValue(mockOpenVbaOnboarding);
  });

  it('renders title, description, and CTA', () => {
    const { getByTestId } = render(<MoneyVbaGetStartedCard />);

    expect(
      getByTestId(MoneyVbaGetStartedCardTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneyVbaGetStartedCardTestIds.TITLE)).toHaveTextContent(
      strings('money.vba_home_card.get_started.title'),
    );
    expect(
      getByTestId(MoneyVbaGetStartedCardTestIds.DESCRIPTION),
    ).toHaveTextContent(strings('money.vba_home_card.get_started.description'));
    expect(
      getByTestId(MoneyVbaGetStartedCardTestIds.CTA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens VBA onboarding with the card source', () => {
    mockUseOpenVbaOnboarding.mockClear();
    render(<MoneyVbaGetStartedCard />);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(
      VBA_GET_STARTED_CARD_SOURCE,
    );
  });

  it('fires the card-shown event once on mount', () => {
    const { rerender } = render(<MoneyVbaGetStartedCard />);
    rerender(<MoneyVbaGetStartedCard />);

    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it('fires the CTA-tap event and opens VBA onboarding on press', () => {
    const { getByTestId } = render(<MoneyVbaGetStartedCard />);

    fireEvent.press(getByTestId(MoneyVbaGetStartedCardTestIds.CTA_BUTTON));

    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GET_STARTED,
        label_key: 'money.vba_home_card.get_started.cta',
        redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
      }),
    );
    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(1);
  });
});
