import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { getNativeTokenAddress } from './asset';

describe('getNativeTokenAddress', () => {
  it('returns Polygon native token address for Polygon chain', () => {
    const result = getNativeTokenAddress(CHAIN_IDS.POLYGON);
    expect(result).toBe('0x0000000000000000000000000000000000001010');
  });

  it('returns default native token address for non-Polygon chains', () => {
    const resultMainnet = getNativeTokenAddress(CHAIN_IDS.MAINNET);
    expect(resultMainnet).toBe(NATIVE_TOKEN_ADDRESS);
    expect(resultMainnet).toBe('0x0000000000000000000000000000000000000000');

    // Test with another chain (e.g., Goerli)
    const resultGoerli = getNativeTokenAddress(CHAIN_IDS.GOERLI);
    expect(resultGoerli).toBe(NATIVE_TOKEN_ADDRESS);
    expect(resultGoerli).toBe('0x0000000000000000000000000000000000000000');
  });

  it('returns default native token address for unknown chain IDs', () => {
    const unknownChainId = '0x999';
    const result = getNativeTokenAddress(unknownChainId);
    expect(result).toBe(NATIVE_TOKEN_ADDRESS);
    expect(result).toBe('0x0000000000000000000000000000000000000000');
  });
});
