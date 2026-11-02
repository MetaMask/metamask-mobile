import React from 'react';
import { render } from '@testing-library/react-native';
import ProSubscriptionPaymentMonitor from './ProSubscriptionPaymentMonitor';
import { useProSubscriptionPaymentMonitor } from '../../hooks/useProSubscriptionPaymentMonitor';

jest.mock('../../hooks/useProSubscriptionPaymentMonitor', () => ({
  useProSubscriptionPaymentMonitor: jest.fn(),
}));

jest.mock('../PaymentFailedSheet', () => {
  const mockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      mockReact.createElement(View, { testID: 'payment-failed-sheet' }),
  };
});

describe('ProSubscriptionPaymentMonitor', () => {
  const mockUseProSubscriptionPaymentMonitor = jest.mocked(
    useProSubscriptionPaymentMonitor,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionPaymentMonitor.mockReturnValue({
      isPaymentFailedSheetOpen: false,
      closePaymentFailedSheet: jest.fn(),
    });
  });

  it('calls the payment monitor once', () => {
    render(<ProSubscriptionPaymentMonitor />);

    expect(mockUseProSubscriptionPaymentMonitor).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the payment has not failed', () => {
    const { toJSON } = render(<ProSubscriptionPaymentMonitor />);

    expect(toJSON()).toBeNull();
  });

  it('renders the payment-failed sheet when the payment fails', () => {
    mockUseProSubscriptionPaymentMonitor.mockReturnValue({
      isPaymentFailedSheetOpen: true,
      closePaymentFailedSheet: jest.fn(),
    });

    const { getByTestId } = render(<ProSubscriptionPaymentMonitor />);

    expect(getByTestId('payment-failed-sheet')).toBeOnTheScreen();
  });
});
