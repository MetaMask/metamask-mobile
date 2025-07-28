import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentMethodSelectorModal from './PaymentMethodSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import usePaymentMethods from '../../../hooks/usePaymentMethods';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { DepositPaymentMethod } from '../../../constants';
import { IconName } from '../../../../../../../component-library/components/Icons/Icon';

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

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../../../hooks/usePaymentMethods', () => jest.fn());

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
  const mockHandleSelectPaymentMethodId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      selectedPaymentMethodId: 'credit_debit_card',
      handleSelectPaymentMethodId: mockHandleSelectPaymentMethodId,
    });
    (usePaymentMethods as jest.Mock).mockReturnValue(mockPaymentMethods);
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
      expect(mockHandleSelectPaymentMethodId).toHaveBeenCalledWith('apple_pay');
    });
  });
});
