import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import PaymentMethodSelectorModal from './PaymentMethodSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { RampType } from '../../types';
import { PaymentType } from '@consensys/on-ramp-sdk';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../../../../Base/RemoteImage', () => jest.fn(() => null));

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics', () => jest.fn(() => mockTrackEvent));

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

const mockSetSelectedPaymentMethodId = jest.fn();

const mockUseRampSDKInitialValues = {
  selectedPaymentMethodId: 'payment-method-1',
  setSelectedPaymentMethodId: mockSetSelectedPaymentMethodId,
  selectedRegion: { id: 'US', name: 'United States' },
  rampType: RampType.BUY,
  isBuy: true,
};

let mockUseRampSDKValues = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

function render(component: React.ComponentType) {
  return renderScreen(component, {
    name: Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR,
  });
}

const mockPaymentMethods = [
  {
    id: 'payment-method-1',
    name: 'Credit Card',
    paymentType: PaymentType.DebitCreditCard,
    logo: { light: ['icon1.png'], dark: ['icon1.png'] },
    icons: ['icon1.png'],
    disclaimer: 'Test disclaimer',
    delay: [0, 0],
    amountTier: [0, 3],
    detail: 'Test detail',
  },
  {
    id: 'payment-method-2',
    name: 'Bank Transfer',
    paymentType: PaymentType.BankTransfer,
    logo: { light: ['icon2.png'], dark: ['icon2.png'] },
    icons: ['icon2.png'],
    delay: [1, 3],
    amountTier: [1, 3],
    detail: 'Test detail',
  },
];

const defaultParams = {
  title: 'Select Payment Method',
  paymentMethods: mockPaymentMethods,
  location: 'Amount to Buy Screen' as const,
};

describe('PaymentMethodSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(defaultParams);
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('renders correctly', () => {
    const { toJSON } = render(PaymentMethodSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders without disclaimer when selected payment method has none', () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      selectedPaymentMethodId: 'payment-method-2',
    };

    const { toJSON } = render(PaymentMethodSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders for sell flow', () => {
    mockUseParams.mockReturnValue({
      ...defaultParams,
      title: 'Select Cash Destination',
    });
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      rampType: RampType.SELL,
      isBuy: false,
    };

    const { toJSON } = render(PaymentMethodSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks RAMPS_PAYMENT_METHOD_SELECTED event when payment method is selected', () => {
    const { getByText } = render(PaymentMethodSelectorModal);

    const paymentMethodElement = getByText('Bank Transfer');
    fireEvent.press(paymentMethodElement);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_PAYMENT_METHOD_SELECTED',
      {
        payment_method_id: 'payment-method-2',
        available_payment_method_ids: ['payment-method-1', 'payment-method-2'],
        region: 'US',
        location: 'Amount to Buy Screen',
      },
    );
  });
  it('does not track RAMPS_PAYMENT_METHOD_SELECTED event when the same payment method is selected', () => {
    const { getByText } = render(PaymentMethodSelectorModal);

    const paymentMethodElement = getByText('Credit Card');
    fireEvent.press(paymentMethodElement);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
