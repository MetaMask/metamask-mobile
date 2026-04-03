import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePriceImpactFiat } from './index';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;

const renderHook = (activeQuote: Parameters<typeof usePriceImpactFiat>[0]) =>
  renderHookWithProvider(() => usePriceImpactFiat(activeQuote), { state: {} });

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

  it('returns undefined when sentAmount.valueInCurrency is null', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: null, usd: null },
      toTokenAmount: { amount: '0.9', valueInCurrency: '90', usd: null },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when toTokenAmount.valueInCurrency is null', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: null },
      toTokenAmount: { amount: '0.9', valueInCurrency: null, usd: null },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    expect(result.current).toBeUndefined();
  });

  it('returns the formatted difference between source and dest fiat values', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: null },
      toTokenAmount: { amount: '0.9', valueInCurrency: '92.95', usd: null },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    // $100 - $92.95 = $7.05
    expect(result.current).toBe('$7.05');
  });

  it('formats result with the user currency symbol', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');

    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '50', usd: null },
      toTokenAmount: { amount: '0.9', valueInCurrency: '45', usd: null },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    // €50 - €45 = €5
    expect(result.current).toMatch(/5/);
    expect(result.current).toMatch(/€|EUR/);
  });

  it('returns a formatted zero value when source and dest fiat are equal', () => {
    const { result } = renderHook({
      sentAmount: { amount: '1', valueInCurrency: '100', usd: null },
      toTokenAmount: { amount: '1', valueInCurrency: '100', usd: null },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    expect(result.current).toBe('$0.00');
  });
});
