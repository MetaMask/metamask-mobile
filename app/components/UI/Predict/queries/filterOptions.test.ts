import {
  normalizeFilterOptionsParams,
  predictFilterOptionsKeys,
  predictFilterOptionsOptions,
} from './filterOptions';
import Engine from '../../../../core/Engine';
import type { PredictFilterOption } from '../types';

const mockListFilterOptions = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      listFilterOptions: (...args: unknown[]) => mockListFilterOptions(...args),
    },
  },
}));

describe('filterOptions query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeFilterOptionsParams', () => {
    it('defaults baseTagSlug to "all" and leaves baseParams undefined when absent', () => {
      expect(normalizeFilterOptionsParams({ source: 'hot-tags' })).toEqual({
        source: 'hot-tags',
        baseTagSlug: 'all',
        limit: undefined,
        baseParams: undefined,
      });
    });

    it('normalizes baseParams via the shared market-list normalizer', () => {
      const normalized = normalizeFilterOptionsParams({
        source: 'hot-tags',
        baseParams: { tagSlugs: ['b', 'a'] },
      });

      expect(normalized.baseParams).toEqual(
        expect.objectContaining({ tagSlugs: ['a', 'b'] }),
      );
    });
  });

  describe('predictFilterOptionsKeys', () => {
    it('is namespaced under predict/filterOptions', () => {
      const key = predictFilterOptionsKeys.list(
        normalizeFilterOptionsParams({ source: 'hot-tags' }),
      );
      expect(key[0]).toBe('predict');
      expect(key[1]).toBe('filterOptions');
    });

    it('produces a stable key regardless of param object key order', () => {
      const keyA = predictFilterOptionsKeys.list(
        normalizeFilterOptionsParams({
          source: 'hot-tags',
          baseTagSlug: 'politics',
          limit: 10,
        }),
      );
      const keyB = predictFilterOptionsKeys.list(
        normalizeFilterOptionsParams({
          limit: 10,
          baseTagSlug: 'politics',
          source: 'hot-tags',
        }),
      );

      expect(keyA).toEqual(keyB);
    });

    it('produces different keys for different base tag slugs', () => {
      const all = predictFilterOptionsKeys.list(
        normalizeFilterOptionsParams({ source: 'hot-tags' }),
      );
      const politics = predictFilterOptionsKeys.list(
        normalizeFilterOptionsParams({
          source: 'hot-tags',
          baseTagSlug: 'politics',
        }),
      );

      expect(all).not.toEqual(politics);
    });
  });

  describe('predictFilterOptionsOptions', () => {
    it('exposes a key derived from the normalized params', () => {
      const options = predictFilterOptionsOptions({
        source: 'hot-tags',
        baseTagSlug: 'politics',
      });

      expect(options.queryKey).toEqual(
        predictFilterOptionsKeys.list(
          normalizeFilterOptionsParams({
            source: 'hot-tags',
            baseTagSlug: 'politics',
          }),
        ),
      );
    });

    it('delegates to the controller with the original params', async () => {
      const result: PredictFilterOption[] = [
        {
          id: 'nba',
          label: 'NBA',
          source: 'hot-tags',
          params: { tagSlugs: ['nba'], order: 'volume24hr', status: 'open' },
        },
      ];
      mockListFilterOptions.mockResolvedValueOnce(result);

      const options = predictFilterOptionsOptions({
        source: 'hot-tags',
        baseTagSlug: 'all',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (options.queryFn as any)();

      expect(data).toBe(result);
      expect(mockListFilterOptions).toHaveBeenCalledWith({
        source: 'hot-tags',
        baseTagSlug: 'all',
      });
    });

    it('throws when the PredictController is unavailable', async () => {
      const original = Engine.context.PredictController;
      // @ts-expect-error - intentionally clearing for the guard path
      Engine.context.PredictController = undefined;

      try {
        const options = predictFilterOptionsOptions({ source: 'hot-tags' });
        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (options.queryFn as any)(),
        ).rejects.toThrow('PredictController not available');
      } finally {
        Engine.context.PredictController = original;
      }
    });
  });
});
