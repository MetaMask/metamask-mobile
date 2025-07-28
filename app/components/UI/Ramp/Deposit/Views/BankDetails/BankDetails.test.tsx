import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import BankDetails from './BankDetails';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockOrderData = {
  id: 'test-order-id',
  state: FIAT_ORDER_STATES.CREATED,
  data: {
    id: 'deposit-order-id',
    provider: 'test-provider',
    createdAt: Date.now(),
    fiatAmount: 100,
    fiatCurrency: 'USD',
    cryptoCurrency: 'USDC',
    network: 'ethereum',
    status: 'created',
    orderType: 'buy',
    walletAddress: '0x123...',
    paymentMethod: 'sepa_bank_transfer',
    paymentOptions: [
      {
        id: 'payment-option-id',
        fields: [
          { name: 'Amount', value: '$100.00' },
          { name: 'First Name (Beneficiary)', value: 'john' },
          { name: 'Last Name (Beneficiary)', value: 'doe' },
          { name: 'Account Number', value: '1234567890' },
          { name: 'Bank Name', value: 'test bank' },
          { name: 'Bank Address', value: '123 bank street' },
        ],
      },
    ],
  },
};

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

let mockConfirmPayment = jest.fn().mockResolvedValue(undefined);
let mockCancelOrder = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config?.method === 'confirmPayment') {
      return [mockUseDepositSdkMethodInitialState, mockConfirmPayment];
    }
    if (config?.method === 'cancelOrder') {
      return [mockUseDepositSdkMethodInitialState, mockCancelOrder];
    }
    return [mockUseDepositSdkMethodInitialState, jest.fn()];
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => mockOrderData),
  useDispatch: jest.fn(() => jest.fn()),
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

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({ orderId: 'test-order-id' })),
}));

jest.mock('../../../index', () => ({
  processFiatOrder: jest.fn(),
}));

jest.mock('../../../Aggregator/sdk', () => ({
  RampSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../sdk', () => ({
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
  useDepositSDK: jest.fn(() => ({
    sdk: {
      sdkMethod: jest.fn(),
    },
  })),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.BANK_DETAILS);
}

describe('BankDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmPayment = jest.fn().mockResolvedValue(undefined);
    mockCancelOrder = jest.fn().mockResolvedValue(undefined);
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(BankDetails);
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with bank info shown', () => {
    const { toJSON } = render(BankDetails);

    fireEvent.press(screen.getByText('Show bank information'));

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls confirmPayment when bank transfer sent button is pressed', async () => {
    render(BankDetails);

    fireEvent.press(screen.getByTestId('main-action-button'));

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith(
        'test-order-id',
        'payment-option-id',
      );
    });
  });

  it('calls cancelOrder when cancel button is pressed', async () => {
    render(BankDetails);

    fireEvent.press(screen.getByText('Cancel order'));

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalled();
    });
  });

  it('toggles bank information visibility when show/hide button is pressed', () => {
    render(BankDetails);

    expect(screen.getByText('Show bank information')).toBeTruthy();

    fireEvent.press(screen.getByText('Show bank information'));

    expect(screen.getByText('Hide bank information')).toBeTruthy();
  });

  it('calls setOptions with correct title when component mounts', () => {
    render(BankDetails);

    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('SEPA Bank Transfer'),
      }),
    );
  });

  it('displays confirmPaymentError when it has a value', () => {
    mockUseDepositSdkMethodInitialState.error = 'Payment confirmation failed';

    render(BankDetails);

    expect(screen.getByText('Payment confirmation failed')).toBeTruthy();
  });
});
