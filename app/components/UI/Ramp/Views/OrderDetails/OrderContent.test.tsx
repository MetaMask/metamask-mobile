import React from 'react';
import { screen } from '@testing-library/react-native';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import OrderContent from './OrderContent';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn().mockResolvedValue(false),
  open: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnValue({
        build: jest.fn(),
      }),
    }),
  }),
}));

const makeOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  id: 'order-1',
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.00663',
  fiatAmount: 16.84,
  providerOrderId: 'provider-order-abc12345',
  providerOrderLink: 'https://provider.example.com/order/abc12345',
  createdAt: 1710936120000,
  totalFeesFiat: 1.93,
  txHash: '0xabc',
  walletAddress: '0x1234567890123456789012345678901234567890',
  status: RampsOrderStatus.Pending,
  network: { name: 'Ethereum', chainId: '1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '~5 minutes',
  orderType: 'BUY',
  cryptoCurrency: {
    symbol: 'ETH',
    iconUrl: 'https://example.com/eth.png',
  },
  fiatCurrency: {
    symbol: 'USD',
    denomSymbol: '$',
    decimals: 2,
  },
  provider: {
    id: 'transak',
    name: 'Transak',
    links: [{ name: 'support', url: 'https://support.transak.com' }],
    logos: { light: '', dark: '' },
    isActive: true,
  },
  ...overrides,
});

const renderOrderContent = (order: RampsOrder) =>
  renderWithProvider(<OrderContent order={order} />, {
    state: {
      engine: {
        backgroundState,
      },
    },
  });

describe('OrderContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a standard debit/credit order', () => {
    const order = makeOrder();
    renderOrderContent(order);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not render bank details section for order without paymentDetails', () => {
    const order = makeOrder();
    renderOrderContent(order);

    expect(screen.queryByText('To complete your order')).toBeNull();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not render bank details section when paymentDetails exists but has no matching fields', () => {
    const order = makeOrder({
      paymentDetails: [
        {
          fiatCurrency: 'USD',
          paymentMethod: 'credit_debit_card',
          fields: [],
        },
      ],
    } as Partial<RampsOrder>);

    renderOrderContent(order);

    expect(screen.queryByText('To complete your order')).toBeNull();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders bank details section when paymentDetails has bank transfer fields', () => {
    const order = makeOrder({
      paymentDetails: [
        {
          fiatCurrency: 'USD',
          paymentMethod: 'manual_bank_transfer',
          fields: [
            { name: 'Amount', id: 'amount', value: '$100.00' },
            {
              name: 'First Name (Beneficiary)',
              id: 'firstName',
              value: 'John',
            },
            {
              name: 'Last Name (Beneficiary)',
              id: 'lastName',
              value: 'Doe',
            },
            {
              name: 'Routing Number',
              id: 'routingNumber',
              value: '021000021',
            },
            {
              name: 'Account Number',
              id: 'accountNumber',
              value: '1234567890',
            },
          ],
        },
      ],
    } as Partial<RampsOrder>);

    renderOrderContent(order);

    expect(screen.getByText('To complete your order')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders bank details with IBAN and BIC for SEPA transfers', () => {
    const order = makeOrder({
      paymentDetails: [
        {
          fiatCurrency: 'EUR',
          paymentMethod: 'sepa_bank_transfer',
          fields: [
            { name: 'Amount', id: 'amount', value: '€85.00' },
            {
              name: 'First Name (Beneficiary)',
              id: 'firstName',
              value: 'Hans',
            },
            {
              name: 'Last Name (Beneficiary)',
              id: 'lastName',
              value: 'Mueller',
            },
            { name: 'IBAN', id: 'iban', value: 'DE89370400440532013000' },
            { name: 'BIC', id: 'bic', value: 'COBADEFFXXX' },
            { name: 'Bank Name', id: 'bankName', value: 'Commerzbank' },
          ],
        },
      ],
    } as Partial<RampsOrder>);

    renderOrderContent(order);

    expect(screen.getByText('To complete your order')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders with close button when showCloseButton is true', () => {
    const order = makeOrder();
    renderWithProvider(<OrderContent order={order} showCloseButton />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Close')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading state when fiatAmount is missing', () => {
    const order = makeOrder({ fiatAmount: undefined as unknown as number });
    renderOrderContent(order);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
