import { computeNetworkTier } from './computeNetworkTier';
import type { NetworkTier } from './types';

type Input = Parameters<typeof computeNetworkTier>[0];

const input = (
  type: Input['type'],
  isInternetReachable: Input['isInternetReachable'],
  cellularGeneration: Input['cellularGeneration'] = null,
): Input => ({
  type,
  cellularGeneration,
  isInternetReachable,
});

describe('computeNetworkTier', () => {
  describe('unreachability priority', () => {
    it.each([
      ['null type', null, null],
      ['unknown', 'unknown', null],
      ['none', 'none', null],
      ['wifi', 'wifi', null],
      ['ethernet', 'ethernet', null],
      ['cellular 5g', 'cellular', '5g'],
      ['cellular 2g', 'cellular', '2g'],
      ['cellular no generation', 'cellular', null],
      ['vpn', 'vpn', null],
      ['bluetooth', 'bluetooth', null],
      ['wimax', 'wimax', null],
      ['other', 'other', null],
    ] as const)(
      'returns NONE for every type when unreachable (priority)',
      (_label, type, cellularGeneration) => {
        const result = computeNetworkTier(
          input(type, false, cellularGeneration),
        );

        expect(result).toBe('NONE');
      },
    );

    it.each([true, null] as const)(
      'returns NONE when type is none and isInternetReachable is %s',
      (isInternetReachable) => {
        const result = computeNetworkTier(input('none', isInternetReachable));

        expect(result).toBe('NONE');
      },
    );
  });

  describe('unknown type', () => {
    it.each([true, null] as const)(
      'returns null when type is unknown and isInternetReachable is %s',
      (isInternetReachable) => {
        const result = computeNetworkTier(
          input('unknown', isInternetReachable),
        );

        expect(result).toBeNull();
      },
    );

    it.each([true, null] as const)(
      'returns null when type is null and isInternetReachable is %s',
      (isInternetReachable) => {
        const result = computeNetworkTier(input(null, isInternetReachable));

        expect(result).toBeNull();
      },
    );
  });

  describe('wifi and ethernet', () => {
    it.each([
      ['wifi', true, 'WIFI'],
      ['wifi', null, 'WIFI'],
      ['ethernet', true, 'WIFI'],
      ['ethernet', null, 'WIFI'],
    ] as const)(
      'maps type=%s reachable=%s → %s',
      (type, isInternetReachable, expected) => {
        const result = computeNetworkTier(input(type, isInternetReachable));

        expect(result).toBe(expected);
      },
    );
  });

  describe('cellular generations', () => {
    it.each([
      ['2g', true, 'SLOW_CELLULAR'],
      ['2g', null, 'SLOW_CELLULAR'],
      ['3g', true, 'SLOW_CELLULAR'],
      ['3g', null, 'SLOW_CELLULAR'],
      ['4g', true, 'FAST_CELLULAR'],
      ['4g', null, 'FAST_CELLULAR'],
      ['5g', true, 'FAST_CELLULAR'],
      ['5g', null, 'FAST_CELLULAR'],
    ] as const)(
      'maps cellular gen=%s reachable=%s → %s',
      (cellularGeneration, isInternetReachable, expected) => {
        const result = computeNetworkTier(
          input('cellular', isInternetReachable, cellularGeneration),
        );

        expect(result).toBe(expected);
      },
    );

    it.each([true, null] as const)(
      'returns null for cellular with no generation when isInternetReachable is %s',
      (isInternetReachable) => {
        const result = computeNetworkTier(
          input('cellular', isInternetReachable, null),
        );

        expect(result).toBeNull();
      },
    );

    it('returns null for cellular with unrecognized generation', () => {
      const result = computeNetworkTier(input('cellular', true, '6g'));

      expect(result).toBeNull();
    });
  });

  describe('unclassified transport types', () => {
    it.each([
      'vpn',
      'bluetooth',
      'wimax',
      'other',
      'future-transport',
    ] as const)(
      'returns null when type is %s and internet is reachable',
      (type) => {
        const result = computeNetworkTier(input(type, true));

        expect(result).toBeNull();
      },
    );

    it.each(['vpn', 'bluetooth', 'wimax', 'other'] as const)(
      'returns null when type is %s and isInternetReachable is null',
      (type) => {
        const result = computeNetworkTier(input(type, null));

        expect(result).toBeNull();
      },
    );
  });

  describe('decision matrix snapshot', () => {
    /**
     * Compact regression table: type × reachability × generation → tier.
     * Guards against priority regressions (unknown beating unreachability).
     */
    it.each([
      // [type, reachable, generation, expected]
      [null, false, null, 'NONE'],
      [null, true, null, null],
      [null, null, null, null],
      ['unknown', false, null, 'NONE'],
      ['unknown', true, null, null],
      ['unknown', null, null, null],
      ['none', false, null, 'NONE'],
      ['none', true, null, 'NONE'],
      ['none', null, null, 'NONE'],
      ['wifi', false, null, 'NONE'],
      ['wifi', true, null, 'WIFI'],
      ['wifi', null, null, 'WIFI'],
      ['ethernet', false, null, 'NONE'],
      ['ethernet', true, null, 'WIFI'],
      ['cellular', false, '5g', 'NONE'],
      ['cellular', false, '2g', 'NONE'],
      ['cellular', false, null, 'NONE'],
      ['cellular', true, '5g', 'FAST_CELLULAR'],
      ['cellular', true, '4g', 'FAST_CELLULAR'],
      ['cellular', true, '3g', 'SLOW_CELLULAR'],
      ['cellular', true, '2g', 'SLOW_CELLULAR'],
      ['cellular', true, null, null],
      ['cellular', null, '5g', 'FAST_CELLULAR'],
      ['cellular', null, null, null],
      ['vpn', false, null, 'NONE'],
      ['vpn', true, null, null],
      ['bluetooth', false, null, 'NONE'],
      ['bluetooth', true, null, null],
      ['wimax', false, null, 'NONE'],
      ['wimax', true, null, null],
      ['other', false, null, 'NONE'],
      ['other', true, null, null],
    ] as const)(
      'maps type=%s reachable=%s gen=%s → %s',
      (type, isInternetReachable, cellularGeneration, expected) => {
        const result = computeNetworkTier(
          input(type, isInternetReachable, cellularGeneration),
        );

        expect(result).toBe(expected as NetworkTier | null);
      },
    );
  });
});
