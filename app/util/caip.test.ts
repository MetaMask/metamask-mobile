import { caipChainIdToHex } from './caip';
import type { CaipChainId } from '@metamask/utils';

describe('caipChainIdToHex', () => {
  it('converts an eip155 mainnet CAIP chain ID to hex', () => {
    const result = caipChainIdToHex('eip155:1' as CaipChainId);
    expect(result).toBe('0x1');
  });

  it('converts an eip155 polygon CAIP chain ID to hex', () => {
    const result = caipChainIdToHex('eip155:137' as CaipChainId);
    expect(result).toBe('0x89');
  });

  it('converts an eip155 arbitrum CAIP chain ID to hex', () => {
    const result = caipChainIdToHex('eip155:42161' as CaipChainId);
    expect(result).toBe('0xa4b1');
  });

  it('returns the raw CAIP chain ID as-is for non-eip155 namespaces', () => {
    const solanaChainId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
    const result = caipChainIdToHex(solanaChainId);
    expect(result).toBe(solanaChainId);
  });

  it('converts eip155 chain 0 to 0x0', () => {
    const result = caipChainIdToHex('eip155:0' as CaipChainId);
    expect(result).toBe('0x0');
  });
});
