import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import BasicInfo, { createEnterAddressNavDetails } from './BasicInfo';
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
    title: 'Enter your basic info',
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.BASIC_INFO,
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

describe('BasicInfo Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetNavigationOptions.mockClear();
  });

  it('renders correctly', () => {
    render(BasicInfo);
    expect(screen.getByText('Enter your basic info')).toBeTruthy();
    expect(screen.getByTestId('first-name-input')).toBeTruthy();
  });

  it('displays form validation errors when continue is pressed with empty fields', () => {
    render(BasicInfo);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('First name is required')).toBeTruthy();
    expect(screen.getByText('Last name is required')).toBeTruthy();
    expect(screen.getByText('Phone number is required')).toBeTruthy();
    expect(screen.getByText('Date of birth is required')).toBeTruthy();
    expect(screen.getByText('Social security number is required')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to address page when form is valid and continue is pressed', () => {
    render(BasicInfo);

    fireEvent.changeText(screen.getByTestId('first-name-input'), 'John');
    fireEvent.changeText(screen.getByTestId('last-name-input'), 'Smith');
    fireEvent.changeText(
      screen.getByPlaceholderText('(234) 567-8910'),
      '1234567890',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('MM/DD/YYYY'),
      '01/01/1990',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('XXX-XX-XXXX'),
      '123456789',
    );

    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createEnterAddressNavDetails(),
    );
  });

  it('calls setOptions with correct title when the component mounts', () => {
    render(BasicInfo);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Enter your basic info',
      }),
    );
  });

  it('shows progress bar indicating step 2 of 4', () => {
    render(BasicInfo);
    const progressBar = screen.getByTestId('deposit-progress-step-2');
    expect(progressBar).toBeTruthy();
  });
});
