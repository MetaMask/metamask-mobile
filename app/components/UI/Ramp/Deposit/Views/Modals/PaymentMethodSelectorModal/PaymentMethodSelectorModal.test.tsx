import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentMethodSelectorModal from './PaymentMethodSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { MOCK_PAYMENT_METHODS } from '../../../testUtils';

const mockSetSelectedPaymentMethod = jest.fn();
const mockUseDepositSDK = jest.fn();
jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics', () => () => mockTrackEvent);

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'PaymentMethodSelectorModal',
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

const mockUseParams = jest.fn();
jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
}));

const mockPaymentMethods = MOCK_PAYMENT_METHODS;

describe('PaymentMethodSelectorModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      paymentMethods: mockPaymentMethods,
    });

    mockUseDepositSDK.mockReturnValue({
      setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
      selectedRegion: { isoCode: 'US' },
      isAuthenticated: false,
      selectedPaymentMethod: mockPaymentMethods[0],
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(PaymentMethodSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays payment methods and allows selection', async () => {
    const { getByText } = renderWithProvider(PaymentMethodSelectorModal);

    expect(getByText('Debit or Credit')).toBeTruthy();
    expect(getByText('Apple Pay')).toBeTruthy();

    const bankTransferElement = getByText('Apple Pay');
    fireEvent.press(bankTransferElement);

    await waitFor(() => {
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
        mockPaymentMethods[1],
      );
    });
  });

  it('tracks RAMPS_PAYMENT_METHOD_SELECTED event when payment method is selected', async () => {
    const { getByText } = renderWithProvider(PaymentMethodSelectorModal);

    const applePayElement = getByText('Apple Pay');
    fireEvent.press(applePayElement);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_PAYMENT_METHOD_SELECTED',
        {
          ramp_type: 'DEPOSIT',
          region: 'US',
          payment_method_id: 'apple_pay',
          is_authenticated: false,
        },
      );
    });
  });
});
