import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EmailAuth from './EmailAuth';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.EMAIL_AUTH,
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
    },
  );
}

describe('EmailAuth Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the EnterEmail view correctly', () => {
    render(EmailAuth);
    expect(
      screen.getByText('We will send you a code to verify your email'),
    ).toBeTruthy();
  });

  it('navigates to EnterCode view on "Send email" button press', () => {
    render(EmailAuth);
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    expect(
      screen.getByText('Enter the 6 digit code that we sent to your email'),
    ).toBeTruthy();
  });

  it('navigates to ID Verify screen on "Continue" button press', () => {
    render(EmailAuth);
    fireEvent.press(screen.getByRole('button', { name: 'Send email' }));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.ID_VERIFY,
      undefined,
    );
  });
});
