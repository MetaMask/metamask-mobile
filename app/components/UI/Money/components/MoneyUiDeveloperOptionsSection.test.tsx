import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MoneyUiDeveloperOptionsSection } from './MoneyUiDeveloperOptionsSection';
import { UserActionType } from '../../../../actions/user/types';

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
  };
});

describe('MoneyUiDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(false);
  });

  it('renders the "Money UI" heading', () => {
    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Money UI')).toBeOnTheScreen();
  });

  it('displays onboarding seen as false when not seen', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Onboarding seen: false')).toBeOnTheScreen();
  });

  it('displays onboarding seen as true when seen', () => {
    mockUseSelector.mockReturnValue(true);

    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Onboarding seen: true')).toBeOnTheScreen();
  });

  it('renders the reset button', () => {
    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    expect(getByText('Reset onboarding screen')).toBeOnTheScreen();
  });

  it('dispatches setMoneyOnboardingSeen(false) when reset button is pressed', () => {
    mockUseSelector.mockReturnValue(true);

    const { getByText } = render(<MoneyUiDeveloperOptionsSection />);

    fireEvent.press(getByText('Reset onboarding screen'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: UserActionType.SET_MONEY_ONBOARDING_SEEN,
        payload: { seen: false },
      }),
    );
  });
});
