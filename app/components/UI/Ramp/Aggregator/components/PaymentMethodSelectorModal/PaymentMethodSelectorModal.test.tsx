import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import PaymentMethodSelectorModal from './PaymentMethodSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { RampType } from '../../types';
import { PaymentType } from '@consensys/on-ramp-sdk';

// Mock useAnalytics
jest.mock('../../../hooks/useAnalytics', () => jest.fn(() => jest.fn()));

// Mock PaymentMethod component
jest.mock('../PaymentMethod', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ payment }: { payment: { name: string } }) => (
      <View testID="payment-method">
        <Text>{payment.name}</Text>
      </View>
    ),
  };
});

// Mock useParams
const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
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
    paymentType: PaymentType.CREDIT_DEBIT_CARD,
    logo: { light: ['icon1.png'], dark: ['icon1.png'] },
    icons: ['icon1.png'],
    disclaimer: 'Test disclaimer',
  },
  {
    id: 'payment-method-2',
    name: 'Bank Transfer',
    paymentType: PaymentType.BANK_TRANSFER,
    logo: { light: ['icon2.png'], dark: ['icon2.png'] },
    icons: ['icon2.png'],
  },
];

const defaultParams = {
  title: 'Select Payment Method',
  onItemPress: jest.fn(),
  paymentMethods: mockPaymentMethods,
  selectedPaymentMethodId: 'payment-method-1',
  selectedPaymentMethodType: PaymentType.CREDIT_DEBIT_CARD,
  selectedRegion: { id: 'US', name: 'United States' },
  location: 'Amount to Buy Screen' as const,
  rampType: RampType.BUY,
};

describe('PaymentMethodSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(defaultParams);
  });

  it('renders correctly', () => {
    const { toJSON } = render(PaymentMethodSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with payment methods', () => {
    const { getByText } = render(PaymentMethodSelectorModal);

    expect(getByText('Select Payment Method')).toBeTruthy();
    expect(getByText('Credit Card')).toBeTruthy();
    expect(getByText('Bank Transfer')).toBeTruthy();
  });

  it('renders disclaimer when selected payment method has one', () => {
    const { getByText } = render(PaymentMethodSelectorModal);

    expect(getByText('Test disclaimer')).toBeTruthy();
  });

  it('renders without disclaimer when selected payment method has none', () => {
    mockUseParams.mockReturnValue({
      ...defaultParams,
      selectedPaymentMethodId: 'payment-method-2',
    });

    const { queryByText } = render(PaymentMethodSelectorModal);

    expect(queryByText('Test disclaimer')).toBeNull();
  });

  it('renders for sell flow', () => {
    mockUseParams.mockReturnValue({
      ...defaultParams,
      title: 'Select Cash Destination',
      rampType: RampType.SELL,
    });

    const { getByText } = render(PaymentMethodSelectorModal);

    expect(getByText('Select Cash Destination')).toBeTruthy();
  });
});
