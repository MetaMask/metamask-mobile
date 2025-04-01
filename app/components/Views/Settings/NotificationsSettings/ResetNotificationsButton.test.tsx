import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import {
  RESET_NOTIFICATIONS_BUTTON_TEST_ID,
  ResetNotificationsButton,
} from './ResetNotificationsButton';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const arrangeMockNavigation = () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = jest.mocked(useNavigation).mockReturnValue({
    navigate: mockNavigate,
  } as MockVar);

  return {
    mockNavigate,
    mockUseNavigation,
  };
};

describe('ResetNotificationsButton', () => {
  const arrangeMocks = () => ({
    ...arrangeMockNavigation(),
  });

  it('renders correctly', () => {
    arrangeMocks();
    render(<ResetNotificationsButton />);
    expect(screen.getByTestId(RESET_NOTIFICATIONS_BUTTON_TEST_ID)).toBeTruthy();
  });

  it('clicks reset button navigates to modal confirm sheet', async () => {
    const mocks = arrangeMocks();
    render(<ResetNotificationsButton />);
    const button = screen.getByTestId(RESET_NOTIFICATIONS_BUTTON_TEST_ID);

    fireEvent.press(button);

    await waitFor(() => {
      // Assert new switch call
      expect(mocks.mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.RESET_NOTIFICATIONS,
        },
      );
    });
  });
});
