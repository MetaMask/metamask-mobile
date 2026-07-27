import type { CaipChainId } from '@metamask/utils';
import { toFilterChainId } from './toFilterChainId';

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToHex: (caipChainId: string) => {
    const [namespace, reference] = caipChainId.split(':');
    const parsed = parseInt(reference, 10);
    if (namespace !== 'eip155' || Number.isNaN(parsed)) {
      throw new Error(`unsupported chain ${caipChainId}`);
    }
    return `0x${parsed.toString(16)}`;
  },
  isNonEvmChainId: (chainId: string) =>
    !chainId.startsWith('0x') && !chainId.startsWith('eip155:'),
}));

describe('toFilterChainId', () => {
  it('converts an EVM CAIP chain id to hex', () => {
    expect(toFilterChainId('eip155:1' as CaipChainId)).toBe('0x1');
    expect(toFilterChainId('eip155:56' as CaipChainId)).toBe('0x38');
  });

  it('returns the original CAIP id for non-EVM chains', () => {
    const solana = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
    expect(toFilterChainId(solana)).toBe(solana);
  });

  it('returns null when the EVM hex conversion fails', () => {
    expect(toFilterChainId('eip155:notanumber' as CaipChainId)).toBe(null);
  });
});
