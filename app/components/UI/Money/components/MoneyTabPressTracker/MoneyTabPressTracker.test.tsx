import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import MoneyTabPressTracker from './MoneyTabPressTracker';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';

jest.mock('../../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    URLS: {
      MONEY_LANDING: 'https://mock.money.landing',
      MUSD_PRICE: 'https://mock.musd.price',
    },
    CARD: {
      CARD_FEES_URL: 'https://mock.card.fees',
    },
  },
}));

jest.mock('../../../../../constants/urls', () => ({
  METAMASK_SUPPORT_URL: 'https://mock.support',
}));

const mockTrackButtonClicked = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../reducers/user', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
  }),
);

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

describe('MoneyTabPressTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
    });
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectMoneyOnboardingSeen) return true;
      if (selector === selectMoneyOnboardingStepperAnimationEnabled)
        return true;
      return undefined;
    });
  });

  it('calls onRegister with a function on mount', () => {
    const onRegister = jest.fn();

    render(<MoneyTabPressTracker onRegister={onRegister} />);

    expect(onRegister).toHaveBeenCalledWith(expect.any(Function));
  });

  it('calls onRegister with null on unmount', () => {
    const onRegister = jest.fn();
    const { unmount } = render(
      <MoneyTabPressTracker onRegister={onRegister} />,
    );

    unmount();

    expect(onRegister).toHaveBeenCalledWith(null);
  });

  it('initialises useMoneyAnalytics with MONEY_HOME_TAB component_name', () => {
    const onRegister = jest.fn();
    render(<MoneyTabPressTracker onRegister={onRegister} />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      component_name: COMPONENT_NAMES.MONEY_HOME_TAB,
    });
  });

  describe('when onboarding has been seen', () => {
    it('registered function calls trackButtonClicked with GO_TO_MONEY_HOME intent and MONEY_HOME redirect', () => {
      const onRegister = jest.fn();
      render(<MoneyTabPressTracker onRegister={onRegister} />);

      const registeredFn = onRegister.mock.calls[0][0] as () => void;
      act(() => {
        registeredFn();
      });

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
        label_key: 'bottom_nav.money',
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });
    });
  });

  describe('when onboarding has not been seen', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectMoneyOnboardingSeen) return false;
        if (selector === selectMoneyOnboardingStepperAnimationEnabled)
          return true;
        return undefined;
      });
    });

    it('registered function calls trackButtonClicked with GO_TO_MONEY_ONBOARDING intent and MONEY_ONBOARDING redirect', () => {
      const onRegister = jest.fn();
      render(<MoneyTabPressTracker onRegister={onRegister} />);

      const registeredFn = onRegister.mock.calls[0][0] as () => void;
      act(() => {
        registeredFn();
      });

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        label_key: 'bottom_nav.money',
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });
  });

  describe('when onboarding flag is disabled', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectMoneyOnboardingSeen) return false;
        if (selector === selectMoneyOnboardingStepperAnimationEnabled)
          return false;
        return undefined;
      });
    });

    it('registered function calls trackButtonClicked with GO_TO_MONEY_HOME intent even when onboarding not seen', () => {
      const onRegister = jest.fn();
      render(<MoneyTabPressTracker onRegister={onRegister} />);

      const registeredFn = onRegister.mock.calls[0][0] as () => void;
      act(() => {
        registeredFn();
      });

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
        label_key: 'bottom_nav.money',
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });
    });
  });
});
