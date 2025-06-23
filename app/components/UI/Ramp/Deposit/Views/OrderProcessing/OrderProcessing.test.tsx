import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import OrderProcessing from './OrderProcessing';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockQuoteId = 'test-quote-id-12345';

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
    useRoute: () => ({
      params: { quoteId: mockQuoteId },
    }),
  };
});

jest.mock('../../../../../UI/Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Order Processing',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.ORDER_PROCESSING);
}

describe('OrderProcessing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    render(OrderProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(OrderProcessing);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Order Processing',
      }),
    );
  });

  it('displays the quote ID', () => {
    render(OrderProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to wallet home on button press', async () => {
    render(OrderProcessing);
    const button = screen.getByRole('button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });
  });
});
