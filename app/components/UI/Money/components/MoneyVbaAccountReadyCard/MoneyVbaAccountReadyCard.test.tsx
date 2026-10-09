import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyVbaAccountReadyCard, {
  VBA_ACCOUNT_READY_CARD_SOURCE,
} from './MoneyVbaAccountReadyCard';
import { MoneyVbaAccountReadyCardTestIds } from './MoneyVbaAccountReadyCard.testIds';
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

describe('MoneyVbaAccountReadyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAnalytics.mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    mockUseOpenVbaOnboarding.mockReturnValue(mockOpenVbaOnboarding);
  });

  it('renders title, description, and CTA', () => {
    const { getByTestId } = render(<MoneyVbaAccountReadyCard />);

    expect(
      getByTestId(MoneyVbaAccountReadyCardTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyVbaAccountReadyCardTestIds.TITLE),
    ).toHaveTextContent(strings('money.vba_home_card.account_is_ready.title'));
    expect(
      getByTestId(MoneyVbaAccountReadyCardTestIds.DESCRIPTION),
    ).toHaveTextContent(
      strings('money.vba_home_card.account_is_ready.description'),
    );
    expect(
      getByTestId(MoneyVbaAccountReadyCardTestIds.CTA_BUTTON),
    ).toBeOnTheScreen();
  });

  it('opens VBA onboarding with the card source', () => {
    mockUseOpenVbaOnboarding.mockClear();
    render(<MoneyVbaAccountReadyCard />);

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(
      VBA_ACCOUNT_READY_CARD_SOURCE,
    );
  });

  it('fires the card-shown event once on mount', () => {
    const { rerender } = render(<MoneyVbaAccountReadyCard />);
    rerender(<MoneyVbaAccountReadyCard />);

    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it('fires the CTA-tap event and opens VBA onboarding on press', () => {
    const { getByTestId } = render(<MoneyVbaAccountReadyCard />);

    fireEvent.press(getByTestId(MoneyVbaAccountReadyCardTestIds.CTA_BUTTON));

    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        label_key: 'money.vba_home_card.account_is_ready.cta',
        redirect_target: SCREEN_NAMES.VBA_ONBOARDING,
      }),
    );
    expect(mockOpenVbaOnboarding).toHaveBeenCalledTimes(1);
  });
});
