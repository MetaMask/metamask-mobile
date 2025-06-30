import React from 'react';
import { screen } from '@testing-library/react-native';
import DepositOrderContent from './DepositOrderContent';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../../../constants/on-ramp';
import { DepositOrder, DepositOrderType } from '@consensys/native-ramps-sdk';

describe('DepositOrderContent Component', () => {
  const mockOrder = {
    id: 'test-order-id-123456',
    provider: FIAT_ORDER_PROVIDERS.TRANSAK,
    createdAt: Date.now(),
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'ETH',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: '0x1234567890123456789012345678901234567890',
    network: '1',
    excludeFromPurchases: false,
    orderType: DepositOrderType.Deposit,
    data: {
      id: 'test-order-id-123456',
      provider: 'test-provider',
      createdAt: Date.now(),
      fiatAmount: 100,
      fiatCurrency: 'USD',
      cryptoCurrency: 'eth',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234567890123456789012345678901234567890',
      providerOrderLink: 'https://transak.com/order/123',
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
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state correctly', () => {
    const errorOrder = { ...mockOrder, state: FIAT_ORDER_STATES.FAILED };

    renderWithProvider(<DepositOrderContent order={errorOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders processing state correctly', () => {
    const processingOrder = { ...mockOrder, state: FIAT_ORDER_STATES.PENDING };

    renderWithProvider(<DepositOrderContent order={processingOrder} />, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
