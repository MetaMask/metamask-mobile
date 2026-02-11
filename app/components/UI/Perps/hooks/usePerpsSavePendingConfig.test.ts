import { renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePerpsSavePendingConfig } from './usePerpsSavePendingConfig';
import { usePerpsPayWithToken } from './useIsPerpsBalanceSelected';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      savePendingTradeConfiguration: jest.fn(),
    },
  },
}));
jest.mock('./useIsPerpsBalanceSelected', () => ({
  usePerpsPayWithToken: jest.fn(),
}));

const mockSavePendingTradeConfiguration = Engine.context.PerpsController
  .savePendingTradeConfiguration as jest.Mock;
const mockUsePerpsPayWithToken = usePerpsPayWithToken as jest.MockedFunction<
  typeof usePerpsPayWithToken
>;

describe('usePerpsSavePendingConfig', () => {
  const defaultOrderForm = {
    asset: 'BTC',
    amount: '100',
    leverage: 10,
    takeProfitPrice: '',
    stopLossPrice: '',
    limitPrice: '',
    type: 'market' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsPayWithToken.mockReturnValue(null);
  });

  it('calls savePendingTradeConfiguration on unmount with asset and config', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig(defaultOrderForm),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledWith('BTC', {
      amount: '100',
      leverage: 10,
      takeProfitPrice: '',
      stopLossPrice: '',
      limitPrice: '',
      orderType: 'market',
      selectedPaymentToken: null,
    });
  });

  it('includes selectedPaymentToken in config when set', () => {
    mockUsePerpsPayWithToken.mockReturnValue({
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    });

    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig(defaultOrderForm),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledWith('BTC', {
      amount: '100',
      leverage: 10,
      takeProfitPrice: '',
      stopLossPrice: '',
      limitPrice: '',
      orderType: 'market',
      selectedPaymentToken: {
        description: 'USDC',
        address: '0xusdc',
        chainId: '0xa4b1',
      },
    });
  });

  it('does not call savePendingTradeConfiguration when orderForm has no asset', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig({ ...defaultOrderForm, asset: undefined }),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).not.toHaveBeenCalled();
  });
});
