import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentMethodSelectorModal from './PaymentMethodSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { DepositPaymentMethod } from '@consensys/native-ramps-sdk/dist/Deposit';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';

const mockSetPaymentMethod = jest.fn();
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


const mockPaymentMethods: DepositPaymentMethod[] = [
  {
    id: 'credit_debit_card',
    name: 'Debit or Credit',
    duration: 'instant',
    icon: IconName.Card,
  },

  {
    id: 'apple_pay',
    name: 'Apple Pay',
    duration: 'instant',
    icon: IconName.Apple,
    iconColor: {
      light: '#000000',
      dark: '#FFFFFF',
    },
  },
];

describe('PaymentMethodSelectorModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      paymentMethods: mockPaymentMethods,
    });

    mockUseDepositSDK.mockReturnValue({
      setPaymentMethod: mockSetPaymentMethod,
      selectedRegion: { isoCode: 'US' },
      isAuthenticated: false,
      paymentMethod: mockPaymentMethods[0],
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
      expect(mockSetPaymentMethod).toHaveBeenCalledWith(mockPaymentMethods[1]);
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
