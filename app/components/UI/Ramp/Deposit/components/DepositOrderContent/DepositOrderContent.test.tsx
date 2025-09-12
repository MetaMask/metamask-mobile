import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import DepositOrderContent from './DepositOrderContent';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';
import { SEPA_PAYMENT_METHOD } from '../../constants';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

describe('DepositOrderContent Component', () => {
  const mockOrder = {
    id: 'test-order-id-123456',
    provider: FIAT_ORDER_PROVIDERS.TRANSAK,
    createdAt: Date.now(),
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: '0x1234567890123456789012345678901234567890',
    network: 'eip155:1',
    excludeFromPurchases: false,
    orderType: DepositOrderType.Deposit,
    data: {
      id: 'test-order-id-123456',
      providerOrderId: 'transak-provider-order-id-123456',
      provider: 'test-provider',
      createdAt: Date.now(),
      fiatAmount: 100,
      fiatCurrency: 'USD',
      cryptoCurrency: 'USDC',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234567890123456789012345678901234567890',
      providerOrderLink: 'https://transak.com/order/123',
      statusDescription: 'Order succeeded',
    } as DepositOrder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders success state correctly', () => {
    renderWithProvider(<DepositOrderContent order={mockOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Order succeeded')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state correctly with statusDescription from API', () => {
    const errorOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
      data: {
        ...mockOrder.data,
        statusDescription: 'Order failed',
      },
    };

    renderWithProvider(<DepositOrderContent order={errorOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Order failed')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state with specific failure reason when statusDescription is available', () => {
    const errorOrderWithReason = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
      data: {
        ...mockOrder.data,
        statusDescription: 'Payment declined due to insufficient funds',
      },
    };

    renderWithProvider(<DepositOrderContent order={errorOrderWithReason} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(
      screen.getByText('Payment declined due to insufficient funds'),
    ).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders no subtitle when statusDescription is empty string', () => {
    const errorOrderWithEmptyReason = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
      data: {
        ...mockOrder.data,
        statusDescription: '',
      },
    };

    renderWithProvider(
      <DepositOrderContent order={errorOrderWithEmptyReason} />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    expect(screen.queryByText('Your deposit is being processed')).toBeNull();
    expect(screen.queryByText('Order failed')).toBeNull();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders no subtitle when statusDescription is missing', () => {
    const orderWithoutStatusDescription = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.PENDING,
      data: {
        id: 'test-order-id-123456',
        providerOrderId: 'transak-provider-order-id-123456',
        provider: 'test-provider',
        createdAt: Date.now(),
        fiatAmount: 100,
        fiatCurrency: 'USD',
        cryptoCurrency: 'USDC',
        network: 'ethereum',
        status: 'PENDING',
        orderType: 'DEPOSIT',
        walletAddress: '0x1234567890123456789012345678901234567890',
        providerOrderLink: 'https://transak.com/order/123',
      } as DepositOrder,
    };

    renderWithProvider(
      <DepositOrderContent order={orderWithoutStatusDescription} />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    // Should not show any subtitle when statusDescription is missing
    expect(screen.queryByText('Your deposit is being processed')).toBeNull();
    expect(screen.queryByText('Order processing')).toBeNull();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders processing state correctly', () => {
    const processingOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.PENDING,
      data: {
        ...mockOrder.data,
        statusDescription: 'Order processing',
      },
    };

    renderWithProvider(<DepositOrderContent order={processingOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Order processing')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders cancelled state correctly', () => {
    const cancelledOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
      data: {
        ...mockOrder.data,
        statusDescription: 'Order cancelled',
      },
    };

    renderWithProvider(<DepositOrderContent order={cancelledOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Order cancelled')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders bank transfer state correctly', () => {
    const bankTransferOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.PENDING,
      data: {
        ...mockOrder.data,
        paymentMethod: SEPA_PAYMENT_METHOD.id,
        statusDescription: 'Bank transfer initiated',
      },
    };

    renderWithProvider(<DepositOrderContent order={bankTransferOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(screen.getByText('Bank transfer initiated')).toBeOnTheScreen();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('copies order ID when copy button is pressed', () => {
    renderWithProvider(<DepositOrderContent order={mockOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    const copyButton = screen.getByText('..123456').parent;
    if (copyButton) {
      fireEvent.press(copyButton);
    }

    expect(Clipboard.setString).toHaveBeenCalledWith(
      'transak-provider-order-id-123456',
    );
  });

  it('renders without fee when fee is not provided', () => {
    const orderWithoutFee = { ...mockOrder, fee: undefined };

    renderWithProvider(<DepositOrderContent order={orderWithoutFee} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders with crypto fee when regular fee is not provided', () => {
    const orderWithCryptoFee = {
      ...mockOrder,
      fee: undefined,
      cryptoFee: '0.001',
    };

    renderWithProvider(<DepositOrderContent order={orderWithCryptoFee} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
