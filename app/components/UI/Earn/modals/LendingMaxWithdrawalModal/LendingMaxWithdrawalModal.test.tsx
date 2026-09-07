import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LendingMaxWithdrawalModal from './index';

const mockGoBack = jest.fn();
const mockIsFocused = jest.fn(() => true);

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      isFocused: mockIsFocused,
    }),
  };
});

describe('LendingMaxWithdrawalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
  });

  it('should render correctly', () => {
    const { getByText } = render(<LendingMaxWithdrawalModal />);

    expect(
      getByText("Why can't I withdraw my full balance?"),
    ).toBeOnTheScreen();
  });

  it('navigates back when the close button is pressed', () => {
    const { getByTestId } = render(<LendingMaxWithdrawalModal />);

    fireEvent.press(getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not navigate back when the screen is not focused', () => {
    mockIsFocused.mockReturnValue(false);

    const { getByTestId } = render(<LendingMaxWithdrawalModal />);

    fireEvent.press(getByTestId('button-icon'));

    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
