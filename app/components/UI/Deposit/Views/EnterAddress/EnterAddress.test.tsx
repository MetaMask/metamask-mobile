import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EnterAddress from './EnterAddress';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.ENTER_ADDRESS,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('EnterAddress Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(EnterAddress);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays form validation errors when continue is pressed with empty fields', () => {
    render(EnterAddress);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.toJSON()).toMatchSnapshot();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to next page when form is valid and continue is pressed', () => {
    render(EnterAddress);
    fireEvent.changeText(
      screen.getByTestId('address-line-1-input'),
      '123 Main St',
    );
    fireEvent.changeText(screen.getByTestId('city-input'), 'New York');
    fireEvent.changeText(screen.getByTestId('state-input'), 'NY');
    fireEvent.changeText(screen.getByTestId('postal-code-input'), '10001');
    fireEvent.changeText(screen.getByTestId('country-input'), 'USA');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(EnterAddress);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your address',
      }),
    );
  });
});
