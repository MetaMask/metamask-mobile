import {
  CHAIN_VALUE_ORDER_OVERRIDE_KEY,
  parsePositionOverrides,
  selectChainValueOrderOverride,
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
              : { [CHAIN_VALUE_ORDER_OVERRIDE_KEY]: flagValue },
          cacheTimestamp: 0,
        },
      },
    },
  };
}

describe('selectChainValueOrderOverride', () => {
  it('returns ordered promoted chains from the override flag', () => {
    const state = createState({
      positionOverrides: [
        { chainId: 'eip155:8453', name: 'Base' },
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'Solana',
        },
      ],
    });

    const result = selectChainValueOrderOverride(state);

    expect(result).toEqual([
      { chainId: 'eip155:8453', name: 'Base' },
      {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        name: 'Solana',
      },
    ]);
  });

  it('returns an empty array when the flag is absent', () => {
    const state = createState();

    const result = selectChainValueOrderOverride(state);

    expect(result).toEqual([]);
  });

  it.each([
    null,
    false,
    [],
    {},
    { positionOverrides: null },
    { positionOverrides: {} },
    { positionOverrides: [] },
  ])('returns an empty array for malformed config value %p', (flagValue) => {
    const state = createState(flagValue);

    const result = selectChainValueOrderOverride(state);

    expect(result).toEqual([]);
  });
});

describe('parsePositionOverrides', () => {
  it('preserves array order for valid entries', () => {
    const result = parsePositionOverrides({
      positionOverrides: [
        { chainId: 'eip155:1', name: 'Ethereum' },
        { chainId: 'eip155:8453', name: 'Base' },
      ],
    });

    expect(result).toEqual([
      { chainId: 'eip155:1', name: 'Ethereum' },
      { chainId: 'eip155:8453', name: 'Base' },
    ]);
  });

  it.each([
    ['non-CAIP chain ID', { chainId: '0x1', name: 'Ethereum' }],
    ['missing chainId', { name: 'Ethereum' }],
    ['missing name', { chainId: 'eip155:1' }],
    ['empty name', { chainId: 'eip155:1', name: '' }],
  ])('skips an entry with %s', (_caseName, entry) => {
    const result = parsePositionOverrides({
      positionOverrides: [entry, { chainId: 'eip155:8453', name: 'Base' }],
    });

    expect(result).toEqual([{ chainId: 'eip155:8453', name: 'Base' }]);
  });

  it('keeps the first occurrence when chainIds are duplicated', () => {
    const result = parsePositionOverrides({
      positionOverrides: [
        { chainId: 'eip155:8453', name: 'Base' },
        { chainId: 'eip155:1', name: 'Ethereum' },
        { chainId: 'eip155:8453', name: 'Base Duplicate' },
      ],
    });

    expect(result).toEqual([
      { chainId: 'eip155:8453', name: 'Base' },
      { chainId: 'eip155:1', name: 'Ethereum' },
    ]);
  });

  it('keeps the configured name as metadata', () => {
    const result = parsePositionOverrides({
      positionOverrides: [{ chainId: 'eip155:1', name: 'Mainnet' }],
    });

    expect(result).toEqual([{ chainId: 'eip155:1', name: 'Mainnet' }]);
  });
});
