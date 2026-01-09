import { renderHook } from '@testing-library/react-hooks';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import useHandleSuccessfulOrder from './useHandleSuccessfulOrder';
import { FiatOrder } from '../../../../../reducers/fiatOrders';

const mockNavigate = jest.fn();
const mockPop = jest.fn();
const mockDispatch = jest.fn();
const mockDispatchThunk = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: () => ({
      pop: mockPop,
    }),
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => ({}),
}));

jest.mock(
  '../../../../hooks/useThunkDispatch',
  () => () =>
    mockDispatchThunk.mockImplementation((thunk) =>
      thunk(mockDispatch, () => ({})),
    ),
);
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);
jest.mock('../../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(),
}));
jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));
jest.mock('../../utils/stateHasOrder', () => jest.fn(() => false));
jest.mock('../utils', () => ({ getNotificationDetails: jest.fn(() => null) }));

describe('useHandleSuccessfulOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track chain_id_source for sell orders', async () => {
    const { result } = renderHook(() => useHandleSuccessfulOrder());

    const sellOrder = {
      id: 'test-order-id',
      orderType: OrderOrderTypeEnum.Sell,
      account: '0x123',
      data: {
        cryptoCurrency: {
          network: {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            shortName: 'Solana',
          },
          symbol: 'USDC',
        },
        fiatCurrency: {
          symbol: 'USD',
        },
        provider: {
          name: 'TestProvider',
        },
        paymentMethod: {
          id: 'test-payment-method',
        },
      },
    } as FiatOrder;

    await result.current(sellOrder);

    expect(mockTrackEvent).toHaveBeenCalledWith('OFFRAMP_PURCHASE_SUBMITTED', {
      payment_method_id: 'test-payment-method',
      order_type: OrderOrderTypeEnum.Sell,
      is_apple_pay: false,
      provider_offramp: 'TestProvider',
      chain_id_source: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      currency_source: 'USDC',
      currency_source_symbol: 'USDC',
      currency_source_network: 'Solana',
      currency_destination: 'USD',
    });
  });

  it('should track event for buy orders', async () => {
    const { result } = renderHook(() => useHandleSuccessfulOrder());

    const buyOrder = {
      id: 'test-order-id',
      orderType: OrderOrderTypeEnum.Buy,
      account: '0x123',
      data: {
        cryptoCurrency: {
          network: {
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            shortName: 'Solana',
          },
          symbol: 'USDC',
        },
        fiatCurrency: {
          symbol: 'USD',
        },
        provider: {
          name: 'TestProvider',
        },
        paymentMethod: {
          id: 'test-payment-method',
        },
      },
    } as FiatOrder;

    await result.current(buyOrder);

    expect(mockTrackEvent).toHaveBeenCalledWith('ONRAMP_PURCHASE_SUBMITTED', {
      payment_method_id: 'test-payment-method',
      order_type: OrderOrderTypeEnum.Buy,
      is_apple_pay: false,
      provider_onramp: 'TestProvider',
      chain_id_destination: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      currency_destination: 'USDC',
      currency_destination_symbol: 'USDC',
      currency_destination_network: 'Solana',
      currency_source: 'USD',
      has_zero_currency_destination_balance: false,
    });
  });
});
