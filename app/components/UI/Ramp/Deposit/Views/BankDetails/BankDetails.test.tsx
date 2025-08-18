import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import BankDetails from './BankDetails';
import Routes from '../../../../../../constants/navigation/Routes';
import { FIAT_ORDER_STATES } from '../../../../../../constants/on-ramp';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { StackActions } from '@react-navigation/native';
import Logger from '../../../../../../util/Logger';
import { endTrace } from '../../../../../../util/trace';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();
const mockProcessFiatOrder = jest.fn();

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
          { name: 'Recipient Address', value: '456 recipient street' },
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
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      dispatch: mockDispatch,
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

jest.mock('../../../index', () => ({
  processFiatOrder: mockProcessFiatOrder,
}));

jest.mock('../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../util/trace'),
  endTrace: jest.fn(),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.BANK_DETAILS,
    },
    { state: initialRootState },
  );
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

  it('displays beneficiary address when bank information is shown', () => {
    render(BankDetails);

    // Initially beneficiary address should not be visible
    expect(screen.queryByText('456 Recipient Street')).toBeNull();

    // Show bank information
    fireEvent.press(screen.getByText('Show bank information'));

    // Beneficiary address should now be visible
    expect(screen.getByText('456 Recipient Street')).toBeTruthy();
  });

  it('calls setOptions with correct title when component mounts', () => {
    render(BankDetails);

    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('SEPA bank transfer'),
      }),
    );
  });

  it('displays confirmPaymentError when it has a value', async () => {
    mockUseDepositSdkMethodInitialState.error = 'Payment confirmation failed';
    mockConfirmPayment = jest
      .fn()
      .mockRejectedValue('Payment confirmation failed');

    render(BankDetails);
    fireEvent.press(screen.getByText('Confirm transfer'));

    await waitFor(() => {
      expect(screen.getByText('Payment confirmation failed')).toBeTruthy();
    });
  });

  it('resets navigation when order state is canceled', () => {
    mockOrderData.state = FIAT_ORDER_STATES.CANCELLED;
    render(BankDetails);

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.DEPOSIT.BUILD_QUOTE,
        },
      ],
    });
  });

  it('dispatches replace action when order state is completed, failed or pending', () => {
    mockDispatch.mockClear();
    mockOrderData.state = FIAT_ORDER_STATES.COMPLETED;
    render(BankDetails);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.DEPOSIT.ORDER_PROCESSING, {
        orderId: 'test-order-id',
      }),
    );

    mockDispatch.mockClear();
    mockOrderData.state = FIAT_ORDER_STATES.FAILED;
    render(BankDetails);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.DEPOSIT.ORDER_PROCESSING, {
        orderId: 'test-order-id',
      }),
    );

    mockDispatch.mockClear();
    mockOrderData.state = FIAT_ORDER_STATES.PENDING;
    render(BankDetails);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.DEPOSIT.ORDER_PROCESSING, {
        orderId: 'test-order-id',
      }),
    );
  });

  it('calls Logger.error when handleOnRefresh fails', async () => {
    mockProcessFiatOrder.mockRejectedValueOnce(new Error('Fetch error'));

    const mockLoggerError = jest.spyOn(Logger, 'error');
    render(BankDetails);

    screen
      .getByTestId('bank-details-refresh-control-scrollview')
      .props.refreshControl.props.onRefresh();

    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('calls Logger.error when handleBankTransferSent fails', async () => {
    mockConfirmPayment.mockImplementationOnce(() => {
      throw new Error('Payment confirmation failed');
    });

    const mockLoggerError = jest.spyOn(Logger, 'error');
    render(BankDetails);
    fireEvent.press(screen.getByTestId('main-action-button'));
    expect(mockConfirmPayment).toHaveBeenCalledWith(
      'test-order-id',
      'payment-option-id',
    );
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('calls Logger.error when cancelOrder fails', async () => {
    mockCancelOrder.mockImplementationOnce(() => {
      throw new Error('Order cancellation failed');
    });

    const mockLoggerError = jest.spyOn(Logger, 'error');
    render(BankDetails);
    fireEvent.press(screen.getByText('Cancel order'));
    expect(mockCancelOrder).toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('should call endTrace three times when component mounts', () => {
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
    mockEndTrace.mockClear();

    render(BankDetails);

    expect(mockEndTrace).toHaveBeenCalledTimes(3);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Load Deposit Experience',
      data: {
        destination: 'BankDetails',
      },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Continue Flow',
      data: {
        destination: 'BankDetails',
      },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Input OTP',
      data: {
        destination: 'BankDetails',
      },
    });
  });
});
