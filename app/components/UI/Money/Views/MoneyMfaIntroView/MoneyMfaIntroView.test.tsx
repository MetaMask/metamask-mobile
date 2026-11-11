import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaIntroView from './MoneyMfaIntroView';
import { MoneyMfaIntroViewTestIds } from './MoneyMfaIntroView.testIds';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

const mockGoBack = jest.fn();
const mockTurnOn = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../hooks/useMoneyMfa', () => ({
  useMoneyMfa: () => ({ turnOn: mockTurnOn }),
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: mockTrackButtonClicked,
    trackComponentViewed: mockTrackComponentViewed,
  })),
}));

jest.mock('../../components/MoneyMfa/MoneyMfaShieldAnimation', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

describe('MoneyMfaIntroView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description and actions', () => {
    const { getByTestId, getByText } = render(<MoneyMfaIntroView />);

    expect(getByTestId(MoneyMfaIntroViewTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('money.mfa.intro_screen_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.mfa.intro_screen_description')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('money.mfa.intro_continue'));
    expect(
      getByTestId(MoneyMfaIntroViewTestIds.NOT_NOW_BUTTON),
    ).toHaveTextContent(strings('money.mfa.intro_not_now'));
  });

  it('tracks the view on mount', () => {
    render(<MoneyMfaIntroView />);

    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it('closes and starts 2-step verification setup on Continue', () => {
    const { getByTestId } = render(<MoneyMfaIntroView />);

    fireEvent.press(getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.intro_continue',
    });
  });

  it('closes without starting setup on Not now', () => {
    const { getByTestId } = render(<MoneyMfaIntroView />);

    fireEvent.press(getByTestId(MoneyMfaIntroViewTestIds.NOT_NOW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTurnOn).not.toHaveBeenCalled();
  });

  it('uses the intro component name for analytics', () => {
    const { useMoneyAnalytics } = jest.requireMock(
      '../../hooks/useMoneyAnalytics',
    );

    render(<MoneyMfaIntroView />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      component_name: COMPONENT_NAMES.MONEY_MFA_INTRO,
    });
  });
});
