import { renderHook, act } from '@testing-library/react-native';
import type { PerpsProviderType } from '@metamask/perps-controller';

import { usePerpsTradeVenue } from './usePerpsTradeVenue';
import { usePerpsProvider } from './usePerpsProvider';

jest.mock('./usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

const mockUsePerpsProvider = usePerpsProvider as jest.MockedFunction<
  typeof usePerpsProvider
>;

// Only selectPerpsDefaultProvider is read through useSelector; the default
// hyperliquid applies when the controller has none saved.
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (state: unknown) => unknown) =>
    selector({ engine: { backgroundState: { PerpsController: {} } } }),
  ),
}));

describe('usePerpsTradeVenue', () => {
  const setMultiProvider = (enabled: boolean) => {
    mockUsePerpsProvider.mockReturnValue({
      isMultiProviderEnabled: enabled,
    } as ReturnType<typeof usePerpsProvider>);
  };

  describe('resolution order', () => {
    it('prefers a route provider that lists the market', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          routeProviderId: 'lighter',
          marketVenueIds: ['hyperliquid', 'lighter'],
        }),
      );

      expect(result.current.tradeVenueId).toBe('lighter');
    });

    it('ignores a route provider that does not list the market', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          routeProviderId: 'lighter',
          marketVenueIds: ['hyperliquid'],
        }),
      );

      // Falls through to the default provider, which lists the market.
      expect(result.current.tradeVenueId).toBe('hyperliquid');
    });

    it('falls back to the market venue when the default does not list it', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          marketVenueIds: ['lighter'],
        }),
      );

      expect(result.current.tradeVenueId).toBe('lighter');
    });

    it('resolves to the default provider while venue data has not loaded', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({ marketVenueIds: [] }),
      );

      expect(result.current.tradeVenueId).toBe('hyperliquid');
    });
  });

  describe('selector visibility', () => {
    it('shows with two venues and multi-provider mode on', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          marketVenueIds: ['hyperliquid', 'lighter'],
        }),
      );

      expect(result.current.isSelectorVisible).toBe(true);
    });

    it('hides on a one-venue market — the order goes to that venue', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({ marketVenueIds: ['lighter'] }),
      );

      expect(result.current.isSelectorVisible).toBe(false);
      expect(result.current.tradeVenueId).toBe('lighter');
      expect(result.current.orderProviderId).toBe('lighter');
    });

    it('hides with multi-provider mode off and passes no per-order venue', () => {
      setMultiProvider(false);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          marketVenueIds: ['hyperliquid', 'lighter'],
        }),
      );

      expect(result.current.isSelectorVisible).toBe(false);
      // Undefined so order navigation falls back to the active provider,
      // exactly as before the Trade-on selector.
      expect(result.current.orderProviderId).toBeUndefined();
    });
  });

  describe('user selection', () => {
    it('applies a selection', () => {
      setMultiProvider(true);
      const { result } = renderHook(() =>
        usePerpsTradeVenue({
          marketVenueIds: ['hyperliquid', 'lighter'],
        }),
      );

      act(() => {
        result.current.selectVenue('lighter');
      });

      expect(result.current.tradeVenueId).toBe('lighter');
      expect(result.current.orderProviderId).toBe('lighter');
    });

    it('follows late venue data until the user picks, then keeps the pick', () => {
      setMultiProvider(true);
      const { result, rerender } = renderHook(
        ({ venueIds }: { venueIds: readonly PerpsProviderType[] }) =>
          usePerpsTradeVenue({ marketVenueIds: venueIds }),
        { initialProps: { venueIds: [] as readonly PerpsProviderType[] } },
      );

      // Catalog arrives: resolution follows it.
      rerender({ venueIds: ['hyperliquid', 'lighter'] });
      expect(result.current.tradeVenueId).toBe('hyperliquid');

      // The user picks; a later re-resolution must not clobber the pick.
      act(() => {
        result.current.selectVenue('lighter');
      });
      rerender({ venueIds: ['lighter', 'hyperliquid'] });

      expect(result.current.tradeVenueId).toBe('lighter');
    });
  });
});
