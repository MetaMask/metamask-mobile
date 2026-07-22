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

  it('returns undefined when priceImpact.valueInCurrency is undefined', () => {
    const { result } = renderHook({
      priceImpact: { valueInCurrency: undefined },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    expect(result.current).toBeUndefined();
  });

  it('formats result with the user currency symbol', () => {
    mockSelectCurrentCurrency.mockReturnValue('EUR');

    const { result } = renderHook({
      priceImpact: { valueInCurrency: '5' },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    // €50 - €45 = €5
    expect(result.current).toMatch(/5/);
    expect(result.current).toMatch(/€|EUR/);
  });

  it('returns a formatted zero value when priceImpact.valueInCurrency is zero', () => {
    const { result } = renderHook({
      priceImpact: { valueInCurrency: '0' },
    } as Parameters<typeof usePriceImpactFiat>[0]);

    expect(result.current).toBe('$0.00');
  });
});
