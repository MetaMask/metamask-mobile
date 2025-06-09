import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import EnterAddress from './EnterAddress';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockPostKycForm = jest.fn().mockResolvedValue({});

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: () => [
    {
      data: {},
      error: null,
      isFetching: false,
    },
    mockPostKycForm,
  ],
}));

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
  return renderDepositTestComponent(Component, Routes.DEPOSIT.ENTER_ADDRESS);
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
    expect(mockPostKycForm).not.toHaveBeenCalled();
  });

  it('submits form data and navigates to next page when form is valid and continue is pressed', async () => {
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

    expect(mockPostKycForm).toHaveBeenCalledWith(
      expect.objectContaining({
        addressLine1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postCode: '10001',
        countryCode: 'USA',
      }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.KYC_PENDING);
    });
  });

  it('does not navigate if form submission fails', async () => {
    mockPostKycForm.mockResolvedValueOnce({ error: 'API error' });

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

    expect(mockPostKycForm).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
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
