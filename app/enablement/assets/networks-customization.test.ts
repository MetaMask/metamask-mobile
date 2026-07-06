import { AccountGroupAssets } from '@metamask/assets-controllers';
import {
  ARC_USDC_ERC20_TOKEN_ADDRESS,
  STABLE_USDT0_ERC20_ADDRESS,
  filterExcludedAssets,
  filterExcludedTokenBalances,
  filterExcludedImportAssets,
} from './networks-customization';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { ImportAsset } from '../../components/Views/AddAsset/utils/utils';

const ARC = NETWORKS_CHAIN_ID.ARC;
const STABLE = NETWORKS_CHAIN_ID.STABLE;
const OTHER_TOKEN = '0x1111111111111111111111111111111111111111';

describe('networks-customization', () => {
  describe('filterExcludedAssets', () => {
    it('removes the excluded ERC-20 on Arc and Stable, keeps other assets', () => {
      const assets = {
        [ARC]: [
          { address: ARC_USDC_ERC20_TOKEN_ADDRESS },
          { address: OTHER_TOKEN },
          { symbol: 'USDC' }, // native-style asset without address
        ],
        [STABLE]: [{ address: STABLE_USDT0_ERC20_ADDRESS }],
        '0x1': [{ address: ARC_USDC_ERC20_TOKEN_ADDRESS }],
      } as unknown as AccountGroupAssets;

      const result = filterExcludedAssets(assets);

      expect(result[ARC]).toEqual([
        { address: OTHER_TOKEN },
        { symbol: 'USDC' },
      ]);
      expect(result[STABLE]).toEqual([]);
      // Same address on an unrelated chain is untouched
      expect(result['0x1']).toEqual([
        { address: ARC_USDC_ERC20_TOKEN_ADDRESS },
      ]);
    });

    it('is case-insensitive on address', () => {
      const assets = {
        [ARC]: [{ address: ARC_USDC_ERC20_TOKEN_ADDRESS.toUpperCase() }],
      } as unknown as AccountGroupAssets;

      expect(filterExcludedAssets(assets)[ARC]).toEqual([]);
    });
  });

  describe('filterExcludedTokenBalances', () => {
    it('strips the excluded balance key only on excluded chains', () => {
      const tokenBalances = {
        '0xaccount': {
          [ARC]: {
            [ARC_USDC_ERC20_TOKEN_ADDRESS]: '0x1',
            [OTHER_TOKEN]: '0x2',
          },
          '0x1': { [ARC_USDC_ERC20_TOKEN_ADDRESS]: '0x3' },
        },
      } as never;

      const result = filterExcludedTokenBalances(tokenBalances);

      expect(result['0xaccount'][ARC]).toEqual({ [OTHER_TOKEN]: '0x2' });
      expect(result['0xaccount']['0x1']).toEqual({
        [ARC_USDC_ERC20_TOKEN_ADDRESS]: '0x3',
      });
    });

    it('is case-insensitive on the balance address key', () => {
      const tokenBalances = {
        '0xaccount': {
          [ARC]: { [ARC_USDC_ERC20_TOKEN_ADDRESS.toUpperCase()]: '0x1' },
        },
      } as never;

      expect(
        filterExcludedTokenBalances(tokenBalances)['0xaccount'][ARC],
      ).toEqual({});
    });
  });

  describe('filterExcludedImportAssets', () => {
    const tokens = [
      { address: ARC_USDC_ERC20_TOKEN_ADDRESS },
      { address: OTHER_TOKEN },
    ] as ImportAsset[];

    it('filters the excluded token on an excluded chain', () => {
      expect(filterExcludedImportAssets(tokens, ARC)).toEqual([
        { address: OTHER_TOKEN },
      ]);
    });

    it('returns tokens unchanged for other chains, CAIP ids, and undefined', () => {
      expect(filterExcludedImportAssets(tokens, '0x1')).toEqual(tokens);
      expect(
        filterExcludedImportAssets(
          tokens,
          'bip122:000000000019d6689c085ae165831e93' as never,
        ),
      ).toEqual(tokens);
      expect(filterExcludedImportAssets(tokens, undefined)).toEqual(tokens);
    });
  });
});
