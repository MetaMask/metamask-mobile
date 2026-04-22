import { renderHook } from '@testing-library/react-native';
import { type OrderFormState } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsSavePendingConfig } from './usePerpsSavePendingConfig';
import { usePerpsPayWithToken } from './useIsPerpsBalanceSelected';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from './useDefaultPayWithTokenWhenNoPerpsBalance';

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
jest.mock('./useDefaultPayWithTokenWhenNoPerpsBalance', () => ({
  useDefaultPayWithTokenWhenNoPerpsBalance: jest.fn(),
  arePaymentTokensEqual: jest.fn(
    (tokenA, tokenB) =>
      tokenA?.address === tokenB?.address &&
      tokenA?.chainId === tokenB?.chainId,
  ),
}));

const mockSavePendingTradeConfiguration = Engine.context.PerpsController
  .savePendingTradeConfiguration as jest.Mock;
const mockUsePerpsPayWithToken = usePerpsPayWithToken as jest.MockedFunction<
  typeof usePerpsPayWithToken
>;
const mockUseDefaultPayToken =
  useDefaultPayWithTokenWhenNoPerpsBalance as jest.MockedFunction<
    typeof useDefaultPayWithTokenWhenNoPerpsBalance
  >;

describe('usePerpsSavePendingConfig', () => {
  const defaultOrderForm: OrderFormState = {
    asset: 'BTC',
    direction: 'long',
    amount: '100',
    leverage: 10,
    balancePercent: 10,
    takeProfitPrice: '',
    stopLossPrice: '',
    limitPrice: '',
    type: 'market',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsPayWithToken.mockReturnValue(null);
    mockUseDefaultPayToken.mockReturnValue(null);
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
      selectedPaymentTokenSource: 'explicit',
    });
  });

  it('marks selected payment token as auto fallback when it matches the default token', () => {
    const defaultToken = {
      description: 'USDC',
      address: '0xusdc',
      chainId: '0xa4b1',
    };
    mockUsePerpsPayWithToken.mockReturnValue(defaultToken);
    mockUseDefaultPayToken.mockReturnValue(defaultToken);

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
      selectedPaymentTokenSource: 'autoNoPerpsBalance',
    });
  });

  it('does not call savePendingTradeConfiguration when orderForm has no asset', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig({ ...defaultOrderForm, asset: '' }),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).not.toHaveBeenCalled();
  });
});
