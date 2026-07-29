import type { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { sumDefiPositionsUsd } from './useDefiSlice';

const protocol = (
  name: string,
  aggregatedMarketValue: number,
): GroupedDeFiPositions['protocols'][number] =>
  ({
    aggregatedMarketValue,
    protocolDetails: { name },
  }) as GroupedDeFiPositions['protocols'][number];

describe('sumDefiPositionsUsd', () => {
  it('aggregates nested protocols across chains and preserves debt signs', () => {
    const positions = {
      '0x1': {
        protocols: {
          aave: protocol('Aave', 100),
          compound: protocol('Compound', -25),
        },
      },
      '0xa': {
        protocols: {
          aave: protocol('Aave', 50),
        },
      },
    } as unknown as Parameters<typeof sumDefiPositionsUsd>[0];

    expect(sumDefiPositionsUsd(positions)).toBe(125);
  });
});
