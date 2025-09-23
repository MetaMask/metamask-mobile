import { renderHook, act } from '@testing-library/react-hooks';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { protectWalletModalVisible } from '../../../../../actions/user';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import useHandleSuccessfulOrder from './useHandleSuccessfulOrder';

const mockDispatch = jest.fn();
const mockNavigation = {
  dangerouslyGetParent: jest.fn().mockReturnValue({
    pop: jest.fn(),
  }),
  navigate: jest.fn(),
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  addFiatOrder: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useRampSDK: jest.fn(() => ({
    selectedChainId: '1',
    selectedAddress: '0x456',
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
  };
});

describe('useHandleSuccessfulOrder', () => {
  it('should handle a successful order correctly for Sell', async () => {
    const order = {
      id: '1',
      orderType: OrderOrderTypeEnum.Sell,
      data: {
        cryptoCurrency: {
          symbol: 'BTC',
        },
        fiatCurrency: {
          symbol: 'USD',
        },
        provider: {
          name: 'Provider A',
        },
      },
    };

    const { result } = renderHook(() => useHandleSuccessfulOrder());

    await act(async () => {
      await result.current(order as FiatOrder);
    });

    expect(mockDispatch).toHaveBeenCalledWith(protectWalletModalVisible());
    expect(mockNavigation.dangerouslyGetParent().pop).toHaveBeenCalled();
  });

  it('should handle a successful order correctly for Onramp', async () => {
    const order = {
      id: '2',
      orderType: OrderOrderTypeEnum.Buy,
      data: {
        cryptoCurrency: {
          symbol: 'ETH',
        },
        fiatCurrency: {
          symbol: 'USD',
        },
        provider: {
          name: 'Provider B',
        },
      },
    };

    const { result } = renderHook(() => useHandleSuccessfulOrder());

    await act(async () => {
      await result.current(order as FiatOrder);
    });

    expect(mockDispatch).toHaveBeenCalledWith(protectWalletModalVisible());
    expect(mockNavigation.dangerouslyGetParent().pop).toHaveBeenCalled();
  });
});
