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

jest.mock('../../../../../core/AppConstants', () => ({
  __esModule: true,
  default: { URLS: { MUSD_LEARN_MORE: 'https://mock.musd' } },
}));

jest.mock('../../../../../constants/urls', () => ({
  METAMASK_SUPPORT_URL: 'https://mock.support',
}));

const mockTrackButtonClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

describe('MoneyTabPressTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
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

  it('registered function calls trackButtonClicked with GO_TO_MONEY_HOME intent and Money label', () => {
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

  it('initialises useMoneyAnalytics with HOME_TAB component_name', () => {
    const onRegister = jest.fn();
    render(<MoneyTabPressTracker onRegister={onRegister} />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      component_name: COMPONENT_NAMES.HOME_TAB,
    });
  });
});
