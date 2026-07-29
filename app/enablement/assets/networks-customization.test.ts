import { AccountGroupAssets } from '@metamask/assets-controllers';
import {
  ARC_USDC_ERC20_TOKEN_ADDRESS,
  STABLE_USDT0_ERC20_ADDRESS,
  augmentAssetControllersState,
  filterExcludedAssets,
  filterExcludedTokenBalances,
  filterExcludedImportAssets,
} from './networks-customization';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { ImportAsset } from '../../components/Views/AddAsset/utils/utils';
import type { AssetsControllerState } from '@metamask/assets-controller';

const ARC = NETWORKS_CHAIN_ID.ARC;
const STABLE = NETWORKS_CHAIN_ID.STABLE;
const OTHER_TOKEN = '0x1111111111111111111111111111111111111111';
const ARC_ERC20_USDC_ASSET_ID = `eip155:5042/erc20:${ARC_USDC_ERC20_TOKEN_ADDRESS}`;
const STABLE_ERC20_USDT0_ASSET_ID = `eip155:988/erc20:${STABLE_USDT0_ERC20_ADDRESS}`;
const OTHER_ASSET_ID = `eip155:1/erc20:${OTHER_TOKEN}`;
const ARC_NATIVE_ASSET_ID = 'eip155:5042/slip44:60';
const STABLE_NATIVE_ASSET_ID = 'eip155:988/slip44:60';

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

  describe('augmentAssetControllersState', () => {
    const baseState = {
      assetsInfo: {},
      assetsPrice: {},
      assetPreferences: {},
      customAssets: {},
      selectedCurrency: 'usd',
    } as AssetsControllerState;

    it('strips Arc ERC20 USDC and Stable ERC20 USDT0, keeps native and unrelated assets', () => {
      const state = {
        ...baseState,
        assetsBalance: {
          'account-1': {
            [ARC_ERC20_USDC_ASSET_ID]: { balance: '1' },
            [STABLE_ERC20_USDT0_ASSET_ID]: { balance: '2' },
            [ARC_NATIVE_ASSET_ID]: { balance: '3' },
            [STABLE_NATIVE_ASSET_ID]: { balance: '4' },
            [OTHER_ASSET_ID]: { balance: '5' },
          },
        },
      } as unknown as AssetsControllerState;

      const result = augmentAssetControllersState(state);

      expect(result.assetsBalance['account-1']).toEqual({
        [ARC_NATIVE_ASSET_ID]: { balance: '3' },
        [STABLE_NATIVE_ASSET_ID]: { balance: '4' },
        [OTHER_ASSET_ID]: { balance: '5' },
      });
    });

    it('is case-insensitive on excluded CAIP asset ids', () => {
      const state = {
        ...baseState,
        assetsBalance: {
          'account-1': {
            [ARC_ERC20_USDC_ASSET_ID.toUpperCase()]: { balance: '1' },
            [STABLE_ERC20_USDT0_ASSET_ID.toUpperCase()]: { balance: '2' },
            [OTHER_ASSET_ID]: { balance: '3' },
          },
        },
      } as unknown as AssetsControllerState;

      expect(
        augmentAssetControllersState(state).assetsBalance['account-1'],
      ).toEqual({
        [OTHER_ASSET_ID]: { balance: '3' },
      });
    });

    it('handles missing assetsBalance', () => {
      const result = augmentAssetControllersState({
        ...baseState,
        assetsBalance: undefined,
      } as unknown as AssetsControllerState);

      expect(result.assetsBalance).toEqual({});
    });
  });
});
