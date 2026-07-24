import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePriceImpactFiat } from './index';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  toQuoteMetadataV2,
  type QuoteMetadata,
} from '@metamask/bridge-controller';

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;

const renderHook = (activeQuote?: QuoteMetadata | null) =>
  renderHookWithProvider(
    () =>
      usePriceImpactFiat(
        activeQuote ? (toQuoteMetadataV2(activeQuote) as never) : activeQuote,
      ),
    { state: {} },
  );

describe('usePriceImpactFiat', () => {
  beforeEach(() => {
    mockSelectCurrentCurrency.mockReturnValue('USD');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when activeQuote is null', () => {
    const { result } = renderHook(null);
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when activeQuote is undefined', () => {
    const { result } = renderHook(undefined);
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when priceImpact.valueInCurrency is undefined', () => {
    const { result } = renderHook({
    //   priceImpact: { valueInCurrency: undefined },
    // } as Parameters<typeof usePriceImpactFiat>[0]);
      sentAmount: { amount: '1', valueInCurrency: undefined, usd: undefined },
      toTokenAmount: { amount: '0.9', valueInCurrency: '90', usd: undefined },
    });

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when toTokenAmount.valueInCurrency is null', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: undefined },
      toTokenAmount: {
        amount: '0.9',
        valueInCurrency: undefined,
        usd: undefined,
      },
    });

    expect(result.current).toBeUndefined();
  });

  it('returns the formatted absolute difference when source fiat is greater than dest fiat', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: undefined },
      toTokenAmount: {
        amount: '0.9',
        valueInCurrency: '92.95',
        usd: undefined,
      },
    });

    // $100 - $92.95 = $7.05
    expect(result.current).toBe('$7.05');
  });

  it('formats result with the user currency symbol', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');

    const { result } = renderHook({
    //   priceImpact: { valueInCurrency: '5' },
    // } as Parameters<typeof usePriceImpactFiat>[0]);
      sentAmount: { amount: '1', valueInCurrency: '50', usd: undefined },
      toTokenAmount: { amount: '0.9', valueInCurrency: '45', usd: undefined },
    });

    // €50 - €45 = €5
    expect(result.current).toMatch(/5/);
    expect(result.current).toMatch(/€|EUR/);
  });

  it('returns a formatted zero value when priceImpact.valueInCurrency is zero', () => {
    const { result } = renderHook({
    //   priceImpact: { valueInCurrency: '0' },
    // } as Parameters<typeof usePriceImpactFiat>[0]);
      sentAmount: { amount: '1', valueInCurrency: '90', usd: undefined },
      toTokenAmount: { amount: '1.1', valueInCurrency: '100', usd: undefined },
    });

    // abs(90 - 100) = 10
    expect(result.current).toBe('$10.00');
  });

  it('returns a formatted zero value when source and dest fiat are equal', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: undefined },
      toTokenAmount: { amount: '1', valueInCurrency: '100', usd: undefined },
    });

    expect(result.current).toBe('$0.00');
  });
});
