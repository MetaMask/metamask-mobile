import { renderHook } from '@testing-library/react-native';
import { type OrderFormState } from '@metamask/perps-controller';
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
      direction: 'long',
      reduceOnly: undefined,
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
      direction: 'long',
      reduceOnly: undefined,
      selectedPaymentToken: {
        description: 'USDC',
        address: '0xusdc',
        chainId: '0xa4b1',
      },
    });
  });

  it('does not call savePendingTradeConfiguration when orderForm has no asset', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig({ ...defaultOrderForm, asset: '' }),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).not.toHaveBeenCalled();
  });

  it('includes reduceOnly in config when provided', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig(defaultOrderForm, { reduceOnly: true }),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledWith('BTC', {
      amount: '100',
      leverage: 10,
      takeProfitPrice: '',
      stopLossPrice: '',
      limitPrice: '',
      orderType: 'market',
      reduceOnly: true,
      direction: 'long',
      selectedPaymentToken: null,
    });
  });

  it('does not save while mounted when the draft amount changes', () => {
    const { rerender, unmount } = renderHook(
      ({ form }: { form: OrderFormState }) => usePerpsSavePendingConfig(form),
      { initialProps: { form: defaultOrderForm } },
    );

    rerender({ form: { ...defaultOrderForm, amount: '200' } });

    expect(mockSavePendingTradeConfiguration).not.toHaveBeenCalled();

    unmount();

    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledTimes(1);
    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledWith(
      'BTC',
      expect.objectContaining({ amount: '200', direction: 'long' }),
    );
  });

  it('includes a short direction in the pending configuration', () => {
    const { unmount } = renderHook(() =>
      usePerpsSavePendingConfig({ ...defaultOrderForm, direction: 'short' }),
    );

    unmount();

    expect(mockSavePendingTradeConfiguration).toHaveBeenCalledWith(
      'BTC',
      expect.objectContaining({ direction: 'short' }),
    );
  });
});
