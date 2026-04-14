import { CardAssetWithBalance } from '../types';
import { getAssetBalanceKey } from './getAssetBalanceKey';
import type { CaipChainId } from '@metamask/utils';

const CHAIN: CaipChainId = 'eip155:59144';

describe('getAssetBalanceKey', () => {
  it('builds the expected key from address, caipChainId, and walletAddress', () => {
    const key = getAssetBalanceKey({
      address: '0xABCDEF',
      caipChainId: CHAIN,
      walletAddress: '0x123456',
    });
    expect(key).toBe('0xabcdef-eip155:59144-0x123456');
  });

  it('lowercases address and walletAddress', () => {
    const key = getAssetBalanceKey({
      address: '0xUPPERCASE',
      caipChainId: CHAIN,
      walletAddress: '0xALSOUPPER',
    });
    expect(key).toBe('0xuppercase-eip155:59144-0xalsoupper');
  });

  it('includes literal "undefined" string when address is undefined', () => {
    const key = getAssetBalanceKey({
      address: undefined,
      caipChainId: CHAIN,
      walletAddress: '0x123456',
    } as unknown as CardAssetWithBalance);
    expect(key).toBe('undefined-eip155:59144-0x123456');
  });

  it('includes literal "undefined" string when walletAddress is undefined', () => {
    const key = getAssetBalanceKey({
      address: '0xABCDEF',
      caipChainId: CHAIN,
      walletAddress: undefined,
    });
    expect(key).toBe('0xabcdef-eip155:59144-undefined');
  });
});
