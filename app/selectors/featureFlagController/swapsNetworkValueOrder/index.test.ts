import {
  CHAIN_VALUE_ORDER_KEY,
  parseNetworkPositionOverrides,
  selectNetworkPositionOverrides,
} from '.';
import type { Json } from '@metamask/utils';
import type { StateWithPartialEngine } from '../types';

function createState(flagValue?: Json): StateWithPartialEngine {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags:
            flagValue === undefined
              ? {}
              : { [CHAIN_VALUE_ORDER_KEY]: flagValue },
          cacheTimestamp: 0,
        },
      },
    },
  };
}

describe('network value order feature flag selector', () => {
  it('returns controller-processed position overrides', () => {
    const state = createState({
      positionOverrides: {
        'eip155:1': { name: 'Ethereum', position: 0 },
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          name: 'Solana',
          position: 2,
        },
      },
    });

    const result = selectNetworkPositionOverrides(state);

    expect(result).toEqual({
      'eip155:1': { name: 'Ethereum', position: 0 },
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
        name: 'Solana',
        position: 2,
      },
    });
  });

  it('returns an empty object when the version-selected flag is absent', () => {
    const state = createState();

    const result = selectNetworkPositionOverrides(state);

    expect(result).toEqual({});
  });

  it.each([null, false, [], { positionOverrides: null }])(
    'returns an empty object for malformed config value %p',
    (flagValue) => {
      const state = createState(flagValue);

      const result = selectNetworkPositionOverrides(state);

      expect(result).toEqual({});
    },
  );
});

describe('parseNetworkPositionOverrides', () => {
  it('keeps entries with CAIP chain IDs, names, and non-negative integer positions', () => {
    const config = {
      positionOverrides: {
        'eip155:8453': { name: 'Base', position: 0 },
      },
    };

    const result = parseNetworkPositionOverrides(config);

    expect(result).toEqual({
      'eip155:8453': { name: 'Base', position: 0 },
    });
  });

  it.each([
    ['non-CAIP chain ID', '0x1', { name: 'Ethereum', position: 0 }],
    ['missing name', 'eip155:1', { position: 0 }],
    ['empty name', 'eip155:1', { name: '', position: 0 }],
    ['string position', 'eip155:1', { name: 'Ethereum', position: '0' }],
    ['fractional position', 'eip155:1', { name: 'Ethereum', position: 1.5 }],
    ['negative position', 'eip155:1', { name: 'Ethereum', position: -1 }],
  ])('drops an entry with %s', (_caseName, chainId, positionOverride) => {
    const config = {
      positionOverrides: {
        [chainId]: positionOverride,
      },
    };

    const result = parseNetworkPositionOverrides(config);

    expect(result).toEqual({});
  });

  it('keeps the configured name as metadata without matching chain ranking', () => {
    const config = {
      positionOverrides: {
        'eip155:1': { name: 'Mainnet', position: 0 },
      },
    };

    const result = parseNetworkPositionOverrides(config);

    expect(result).toEqual({
      'eip155:1': { name: 'Mainnet', position: 0 },
    });
  });
});
