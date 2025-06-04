import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

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

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Build Quote',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.BUILD_QUOTE);
}

describe('BuildQuote Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly', () => {
    render(BuildQuote);
    expect(screen.getByText('Build Quote Page Placeholder')).toBeTruthy();
  });

  it('navigates to Email screen on "Continue" button press', () => {
    render(BuildQuote);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('calls setOptions when the component mounts', () => {
    render(BuildQuote);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Build Quote',
      }),
    );
  });
});
