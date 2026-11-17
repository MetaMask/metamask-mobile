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
        conversionRate: 3890.556,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('38905.56');
  });

  it('return 0 if input is empty string', () => {
    expect(
      getFiatValueFn({
        conversionRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('0.00');
  });

  it('use conversionRate 1 if conversionRate is not passed', () => {
    expect(
      getFiatValueFn({
        conversionRate: undefined as unknown as number,
        amount: '10',
        decimals: 2,
      }),
    ).toStrictEqual('10.00');
  });

  // Regression: #36401 changed `fiat.conversionRate` to the token's own fiat
  // price, but the token price in the native coin was still applied on top, so
  // the token price was counted twice. A $1 stablecoin must stay $1 regardless
  // of how expensive the chain's native coin is.
  it('values a stablecoin at its own fiat price on an expensive-native chain', () => {
    expect(
      getFiatValueFn({
        conversionRate: 1,
        amount: '100',
        decimals: 6,
      }),
    ).toStrictEqual('100.00');
  });

  it('values a token at its own fiat price on a cheap-native chain', () => {
    expect(
      getFiatValueFn({
        conversionRate: 0.5,
        amount: '100',
        decimals: 18,
      }),
    ).toStrictEqual('50.00');
  });
});

describe('getFiatDisplayValueFn', () => {
  it('return fiat value with currency prefix for passed native value', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 3890.556,
        currentCurrency: 'usd',
        amount: '10',
      }),
    ).toStrictEqual('$ 38,905.56');
  });

  it('return 0 if amount is not passed', () => {
    expect(
      getFiatDisplayValueFn({
        conversionRate: 3890.556,
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
        conversionRate: 3890.556,
        amount: '38905.56',
        decimals: 2,
      }),
    ).toStrictEqual('10.00');
  });

  it('return empty string if input is empty string', () => {
    expect(
      getNativeValueFn({
        conversionRate: 3890.556,
        amount: '',
        decimals: 2,
      }),
    ).toStrictEqual('');
  });

  it('return 0 if input is invalid decimal', () => {
    expect(
      getNativeValueFn({
        conversionRate: 3890.556,
        amount: 'abc',
        decimals: 2,
      }),
    ).toStrictEqual('0');
  });

  // Regression: fiat entry inverted the same doubled rate, so $10 of a
  // stablecoin resolved to roughly 40,000 tokens with ETH at $4,000.
  it('converts a fiat amount into the matching stablecoin amount', () => {
    expect(
      getNativeValueFn({
        conversionRate: 1,
        amount: '10',
        decimals: 6,
      }),
    ).toStrictEqual('10.00000');
  });

  it('returns 0 when the conversion rate is 0', () => {
    expect(
      getNativeValueFn({
        conversionRate: 0,
        amount: '10',
        decimals: 6,
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

  // CONF-2189: the two asset sources must agree once normalised.
  //
  // USDC on Ethereum with ETH at $4,000 and USDC at 0.00025 ETH is worth
  // exactly $1.00 per token, so 100 USDC is $100.00 no matter which selector
  // produced the asset. The in-flow picker supplies the token's fiat price
  // directly; `useRouteParams` folds the token's native-coin price into the
  // upstream native-to-fiat rate to reach the same number.
  describe('consistency across asset sources', () => {
    const usdcBase = {
      address: '0xusdc',
      chainId: '0x1',
      decimals: 6,
      symbol: 'USDC',
    };

    afterEach(() => {
      mockUseSendContext.mockReturnValue(
        {} as ReturnType<typeof useSendContext>,
      );
    });

    it('values 100 USDC at $100 for a picker-sourced asset', () => {
      mockUseSendContext.mockReturnValue({
        // selectConfirmationAssetsByAccountGroupId -> price.price
        asset: { ...usdcBase, fiat: { conversionRate: 1 } },
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.getFiatValue('100')).toStrictEqual('100.00');
    });

    it('values 100 USDC at $100 for a normalised route-param asset', () => {
      mockUseSendContext.mockReturnValue({
        // selectAssetsBySelectedAccountGroup gives 4000 (native->fiat);
        // useRouteParams folds in the 0.00025 token price -> 1.
        asset: { ...usdcBase, fiat: { conversionRate: 4000 * 0.00025 } },
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.getFiatValue('100')).toStrictEqual('100.00');
    });

    it('values 1 ETH at the native rate from either source', () => {
      // Native coins are untouched by normalisation: both sources already
      // carry the native-to-fiat rate.
      mockUseSendContext.mockReturnValue({
        asset: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x1',
          decimals: 18,
          isNative: true,
          symbol: 'ETH',
          fiat: { conversionRate: 4000 },
        },
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.getFiatValue('1')).toStrictEqual('4000.00');
    });

    it('converts $100 back to 100 USDC in fiat-entry mode', () => {
      mockUseSendContext.mockReturnValue({
        asset: { ...usdcBase, fiat: { conversionRate: 1 } },
        chainId: '0x1',
      } as unknown as ReturnType<typeof useSendContext>);

      const { result } = renderHookWithProvider(
        () => useCurrencyConversions(),
        mockState,
      );

      expect(result.current.getNativeValue('100')).toStrictEqual('100.00000');
    });
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
