import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import OtpCode from './OtpCode';
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
      name: Routes.DEPOSIT.OTP_CODE,
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
    render(OtpCode);
    expect(
      screen.getByText('Enter the 6 digit code that we sent to your email'),
    ).toBeTruthy();
  });
});
