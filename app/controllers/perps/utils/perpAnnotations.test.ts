/**
 * @jest-environment node
 */
import {
  fetchPerpAnnotation,
  fetchPerpAnnotationsMap,
  fetchPerpConciseAnnotations,
  PERP_DISPLAY_SYMBOL_FALLBACKS,
} from './perpAnnotations';

describe('perpAnnotations', () => {
  describe('PERP_DISPLAY_SYMBOL_FALLBACKS', () => {
    it('includes xyz:CL → WTICRUDE mapping', () => {
      expect(PERP_DISPLAY_SYMBOL_FALLBACKS['xyz:CL']).toBe('WTICRUDE');
    });
  });

  describe('fetchPerpConciseAnnotations', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('throws when API fails', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchPerpConciseAnnotations({ isTestnet: false }),
      ).rejects.toThrow('Network error');
    });

    it('parses API response and merges fallbacks', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          [
            ['xyz:CUSTOM', { displayName: 'CUSTOM_LABEL' }],
            ['dex:CATS', { category: 'indices', keywords: ['meow'] }],
          ] as [string, Record<string, unknown>][],
      });

      const map = await fetchPerpConciseAnnotations({ isTestnet: false });

      expect(map.get('xyz:CUSTOM')).toBe('CUSTOM_LABEL');
      expect(map.get('xyz:CL')).toBe('WTICRUDE'); // fallback
    });

    it('uses description when displayName not present', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          [['xyz:SP500', { description: 'S&P 500' }]] as [
            string,
            Record<string, unknown>,
          ][],
      });

      const map = await fetchPerpConciseAnnotations({ isTestnet: false });

      expect(map.get('xyz:SP500')).toBe('S&P 500');
    });
  });

  describe('fetchPerpAnnotation', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns displayLabel from description when usable', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ category: 'commodity', description: 'WTICRUDE' }),
      });

      const result = await fetchPerpAnnotation({
        coin: 'xyz:CL',
        isTestnet: false,
      });

      expect(result).toEqual({ displayLabel: 'WTICRUDE' });
    });

    it('returns null for generic other perps description', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ category: 'other', description: 'other perps' }),
      });

      const result = await fetchPerpAnnotation({
        coin: 'BTC',
        isTestnet: false,
      });

      expect(result).toBeNull();
    });

    it('returns null on HTTP error', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchPerpAnnotation({
        coin: 'xyz:X',
        isTestnet: false,
      });

      expect(result).toBeNull();
    });
  });

  describe('fetchPerpAnnotationsMap', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('supplements missing HIP-3 symbols via perpAnnotation', async () => {
      globalThis.fetch = jest
        .fn()
        .mockImplementation(async (_url: string, init?: RequestInit) => {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { type?: string; coin?: string })
            : {};
          if (body.type === 'perpConciseAnnotations') {
            return {
              ok: true,
              json: async () => [],
            };
          }
          if (body.type === 'perpAnnotation' && body.coin === 'xyz:OIL') {
            return {
              ok: true,
              json: async () => ({
                category: 'commodity',
                description: 'CRUDE_LABEL',
              }),
            };
          }
          return { ok: true, json: async () => ({}) };
        });

      const map = await fetchPerpAnnotationsMap({
        isTestnet: false,
        universeSymbols: ['BTC', 'xyz:OIL'],
      });

      expect(map.get('xyz:OIL')).toBe('CRUDE_LABEL');
      expect(map.has('BTC')).toBe(false);
      expect(map.get('xyz:CL')).toBe('WTICRUDE');
    });

    it('returns fallbacks when concise fetch fails', async () => {
      globalThis.fetch = jest.fn().mockRejectedValue(new Error('network'));

      const map = await fetchPerpAnnotationsMap({
        isTestnet: false,
        universeSymbols: ['xyz:CL'],
      });

      expect(map.get('xyz:CL')).toBe('WTICRUDE');
    });
  });
});
