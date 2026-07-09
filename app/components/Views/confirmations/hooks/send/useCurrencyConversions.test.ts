import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../__mocks__/send.mock';
import { AssetType } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import {
  getFiatDisplayValueFn,
  getFiatValueFn,
  getNativeValueFn,
  useCurrencyConversions,
} from './useCurrencyConversions';

jest.mock('../gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: () => ({
    gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
  }),
}));

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn().mockReturnValue({}),
}));

const mockUseSendContext = jest.mocked(useSendContext);

const mockState = {
  state: evmSendStateMock,
};

describe('getFiatValueFn', () => {
  it('return fiat value for passed native value', () => {
    expect(
      getFiatValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('38905.56');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getFiatValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('0.00');
  });

  it('use conversionRate 1 if conversionRate is not passed', () => {
    expect(
      getFiatValueFn({
        conversionRate: undefined as unknown as number,
        exchangeRate: 3890.556,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('38905.56');
  });
});

describe('getFiatDisplayValueFn', () => {
  it('return fiat value with currency prefix for passed native value', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        currentCurrency: 'usd',
        amount: '10',
      }),
    ).toStrictEqual('$ 38905.56');
  });

  it('return 0 if amount is not passed', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        currentCurrency: 'usd',
        amount: '',
      }),
    ).toStrictEqual('$ 0.00');
  });
});

describe('getNativeValueFn', () => {
  it('return native value for passed fiat value', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '38905.56',
        decimals: 2,
      }),
    ).toStrictEqual('10.00');
  });

  it('return empty string if input is empty string', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('');
  });

  it('return 0 if input is invalid decimal', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        exchangeRate: 3890.556,
        amount: 'abc',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });
});

describe('useCurrencyConversions', () => {
  it('return conversion functions', () => {
    const { result } = renderHookWithProvider(
      () => useCurrencyConversions(),
      mockState,
    );
    expect(result.current.fiatCurrencySymbol).toBeDefined();
    expect(result.current.getFiatDisplayValue).toBeDefined();
    expect(result.current.getFiatValue).toBeDefined();
    expect(result.current.getNativeValue).toBeDefined();
  });

  describe('show fiat on testnets setting', () => {
    const sepoliaAsset = {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0xaa36a7',
      decimals: 18,
      fiat: { conversionRate: 3000 },
      symbol: 'SepoliaETH',
    } as unknown as AssetType;

    afterEach(() => {
      mockUseSendContext.mockReturnValue(
        {} as ReturnType<typeof useSendContext>,
      );
    });

    it('does not support conversion for testnet assets when the setting is disabled', () => {
      mockUseSendContext.mockReturnValue({
        asset: sepoliaAsset,
        chainId: '0xaa36a7',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.conversionSupportedForAsset).toBe(false);
    });

    it('supports conversion for testnet assets when the setting is enabled', () => {
      mockUseSendContext.mockReturnValue({
        asset: sepoliaAsset,
        chainId: '0xaa36a7',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        {
          state: {
            ...evmSendStateMock,
            settings: { showFiatOnTestnets: true },
          },
        },
      );

      expect(result.current.conversionSupportedForAsset).toBe(true);
    });

    it('supports conversion for mainnet assets regardless of the setting', () => {
      mockUseSendContext.mockReturnValue({
        asset: {
          ...sepoliaAsset,
          chainId: '0x1',
          symbol: 'ETH',
        },
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.conversionSupportedForAsset).toBe(true);
    });
  });
});
