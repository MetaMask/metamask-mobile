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

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Enter your address',
  }),
}));

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
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetNavigationOptions.mockClear();
  });

  it('renders correctly', () => {
    render(EnterAddress);
    expect(screen.getByText('Enter your address')).toBeTruthy();
    expect(screen.getByTestId('address-line-1-input')).toBeTruthy();
  });

  it('displays form validation errors when continue is pressed with empty fields', () => {
    render(EnterAddress);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Address line 1 is required')).toBeTruthy();
    expect(screen.getByText('City is required')).toBeTruthy();
    expect(screen.getByText('State/Region is required')).toBeTruthy();
    expect(screen.getByText('Postal/Zip Code is required')).toBeTruthy();
    expect(screen.getByText('Country is required')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to next page when form is valid and continue is pressed', () => {
    render(EnterAddress);

    fireEvent.changeText(
      screen.getByTestId('address-line-1-input'),
      '123 Main St',
    );
    fireEvent.changeText(screen.getByTestId('address-line-2-input'), 'Apt 4B');
    fireEvent.changeText(screen.getByTestId('city-input'), 'New York');
    fireEvent.changeText(screen.getByTestId('state-input'), 'NY');
    fireEvent.changeText(screen.getByTestId('postal-code-input'), '10001');
    fireEvent.changeText(screen.getByTestId('country-input'), 'USA');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalled();
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(EnterAddress);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your address',
      }),
    );
  });

  it('shows progress bar indicating step 2 of 4', () => {
    render(EnterAddress);
    const progressBar = screen.getByTestId('deposit-progress-step-2');
    expect(progressBar).toBeTruthy();
  });
});
