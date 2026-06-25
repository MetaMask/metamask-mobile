import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import type { TokenAmount } from '../../../../util/activity-adapters';
import {
  getActivityTokenAddress,
  getActivityTokenCaipChainId,
  toBridgeToken,
} from './activityDetailsDoItAgainUtils';

describe('activityDetailsDoItAgainUtils', () => {
  describe('getActivityTokenAddress', () => {
    it('returns the contract address for an ERC-20 asset id', () => {
      const token = {
        assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
        direction: 'out',
      } as TokenAmount;

      expect(getActivityTokenAddress(token)).toBe(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );
    });

    it('returns undefined for native (slip44) assets rather than the coin type', () => {
      const token = {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        decimals: 18,
        direction: 'out',
      } as TokenAmount;

      expect(getActivityTokenAddress(token)).toBeUndefined();
    });

    it('returns undefined when there is no asset id', () => {
      expect(getActivityTokenAddress(undefined)).toBeUndefined();
    });
  });

  describe('toBridgeToken', () => {
    it('uses the native swaps sentinel address for native source tokens', () => {
      const token = {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        decimals: 18,
        direction: 'out',
      } as TokenAmount;

      expect(toBridgeToken(token, 'eip155:1')).toStrictEqual({
        address: NATIVE_SWAPS_TOKEN_ADDRESS,
        symbol: 'ETH',
        decimals: 18,
        chainId: 'eip155:1',
      });
    });

    it('derives chainId from the asset id when present', () => {
      const token = {
        assetId: 'eip155:8453/slip44:60',
        symbol: 'ETH',
        decimals: 18,
        direction: 'out',
      } as TokenAmount;

      expect(getActivityTokenCaipChainId(token, 'eip155:1')).toBe(
        'eip155:8453',
      );
      expect(toBridgeToken(token, 'eip155:1')?.chainId).toBe('eip155:8453');
    });
  });
});
