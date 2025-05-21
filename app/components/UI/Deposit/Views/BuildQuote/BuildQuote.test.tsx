import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import BuildQuote from './BuildQuote';
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
      name: Routes.DEPOSIT.BUILD_QUOTE,
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

describe('BuildQuote Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly', () => {
    render(BuildQuote);
    expect(screen.getByText('Build Quote Page')).toBeTruthy();
  });

  it('navigates to EmailAuth screen on "Continue" button press', () => {
    render(BuildQuote);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.DEPOSIT.EMAIL_AUTH,
      undefined,
    );
  });
});
