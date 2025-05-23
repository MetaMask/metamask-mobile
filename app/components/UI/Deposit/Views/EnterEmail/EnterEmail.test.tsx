import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EnterEmail from './EnterEmail.styles';
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
      name: Routes.DEPOSIT.ENTER_EMAIL,
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

describe('OtpCode Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the OtpCode view correctly', () => {
    render(EnterEmail);
    expect(
      screen.getByText(
        "We'll send a six-digit code to your email to check it's you.",
      ),
    ).toBeTruthy();
  });
});
