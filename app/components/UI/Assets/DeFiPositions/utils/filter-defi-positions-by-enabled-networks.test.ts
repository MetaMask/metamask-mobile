import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import { filterDeFiPositionsByEnabledNetworks } from './filter-defi-positions-by-enabled-networks';

const makePosition = (
  overrides: Partial<DeFiProtocolPositionGroup>,
): DeFiProtocolPositionGroup => ({
  protocolId: 'Aave V3',
  productName: 'Aave V3',
  protocolIconUrl: 'https://example.com/aave.png',
  chainId: 'eip155:1',
  marketValue: 100,
  iconGroup: [],
  sections: [],
  ...overrides,
});

describe('filterDeFiPositionsByEnabledNetworks', () => {
  it('filters out positions on chains not in the provided list', () => {
    const positions = [
      makePosition({ protocolId: 'OnMainnet', chainId: 'eip155:1' }),
      makePosition({ protocolId: 'OnPolygon', chainId: 'eip155:137' }),
    ];

    const result = filterDeFiPositionsByEnabledNetworks(positions, ['0x1']);

    expect(result).toHaveLength(1);
    expect(result[0].protocolId).toBe('OnMainnet');
  });

  it('keeps non-EVM positions regardless of the provided chain ids', () => {
    const positions = [
      makePosition({
        protocolId: 'Solana',
        chainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as DeFiProtocolPositionGroup['chainId'],
      }),
    ];

    const result = filterDeFiPositionsByEnabledNetworks(positions, ['0x1']);

    expect(result).toHaveLength(1);
    expect(result[0].protocolId).toBe('Solana');
  });

  it('returns no EVM positions when the chain id list is empty', () => {
    const positions = [
      makePosition({ protocolId: 'OnMainnet', chainId: 'eip155:1' }),
    ];

    const result = filterDeFiPositionsByEnabledNetworks(positions, []);

    expect(result).toHaveLength(0);
  });
});
