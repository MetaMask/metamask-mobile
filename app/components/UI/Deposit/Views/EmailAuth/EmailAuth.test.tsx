import React from 'react';
import { screen } from '@testing-library/react-native';
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
      screen.getByText(
        "We'll send a six-digit code to your email to check it's you.",
      ),
    ).toBeTruthy();
  });
});
