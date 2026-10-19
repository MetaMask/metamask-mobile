import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import { MoneyMfaTestIds } from '../../components/MoneyMfa';
import MoneyMfaIntroView from './MoneyMfaIntroView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../hooks/useMoneyMfa', () => ({
  useMoneyMfa: jest.fn(),
}));

const mockTurnOn = jest.fn();

describe('MoneyMfaIntroView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useMoneyMfa).mockReturnValue({
      status: 'not_set_up',
      turnOn: mockTurnOn,
      retry: jest.fn(),
      turnOff: jest.fn(),
      dismissFailure: jest.fn(),
      refreshCredentials: jest.fn(),
    });
  });

  it('renders the passkey intro', () => {
    const { getByTestId, getByText } = render(<MoneyMfaIntroView />);

    expect(getByTestId(MoneyMfaTestIds.INTRO)).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.intro_title'))).toBeOnTheScreen();
  });

  it('goes back without turning on 2-step verification when back is pressed', () => {
    const { getByTestId } = render(<MoneyMfaIntroView />);

    fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTurnOn).not.toHaveBeenCalled();
  });

  it('goes back and turns on 2-step verification when Add passkey is pressed', () => {
    const { getByTestId } = render(<MoneyMfaIntroView />);

    fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTurnOn).toHaveBeenCalledTimes(1);
  });
});
