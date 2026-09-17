import { cloneDeep } from 'lodash';
import type { AccountGroupId } from '@metamask/account-api';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { backgroundState } from '../../../../util/test/initial-root-state';
import type { RootState } from '../../../../reducers';
import fixture from '../../../../selectors/assets/__fixtures__/assets-controller-state-log.json';
import {
  selectAccountGroupAssetBalance,
  selectAccountGroupAssets,
} from './assets';

const ACCOUNT_ID = Object.keys(fixture.AssetsController.assetsBalance)[0];
const TOKEN_ADDRESS = '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';
const TOKEN_ASSET_ID = `eip155:143/erc20:${TOKEN_ADDRESS}`;
const TOKEN_CHAIN_ID = '0x8f';
const NATIVE_ASSET_ID = 'eip155:1/slip44:60';

/**
 * These tests run against a real logged `AssetsController` state dump rather
 * than hand-written fixtures. Hand-written state hides shape mismatches — the
 * decimal-scaling and missing-`accountType` bugs both passed synthetic tests
 * and only surfaced against real data.
 */

interface Fixture {
  AccountTreeController: {
    accountTree: {
      wallets: Record<
        string,
        { groups: Record<string, { accounts: string[] }> }
      >;
    };
  };
}

const ACCOUNT_TYPE = 'eip155:eoa';

function buildState(overrides: Record<string, unknown> = {}): RootState {
  const { accountTree } = (fixture as unknown as Fixture).AccountTreeController;

  const accountIds = Object.values(accountTree.wallets).flatMap((wallet) =>
    Object.values(wallet.groups).flatMap((group) => group.accounts),
  );

  const accounts = Object.fromEntries(
    accountIds.map((id) => [
      id,
      {
        id,
        address: '0x1234567890123456789012345678901234567890',
        type: ACCOUNT_TYPE,
        scopes: ['eip155:0'],
        options: {},
        methods: [],
        metadata: {
          name: 'Account',
          importTime: 0,
          keyring: { type: 'HD Key Tree' },
        },
      },
    ]),
  );

  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        ...fixture,
        AccountsController: {
          internalAccounts: { accounts, selectedAccount: accountIds[0] },
        },
        ...overrides,
      },
    },
    settings: { showFiatOnTestnets: true },
  } as unknown as RootState;
}

describe('selectAccountGroupAssets', () => {
  it('returns assets for the selected account group', () => {
    const assets = selectAccountGroupAssets(buildState(), undefined);

    expect(assets.length).toBeGreaterThan(0);
  });

  it('sets accountType on every asset', () => {
    // Regression: without `accountType`, `useSendTokens` filters out every
    // token via `token.accountType?.includes(namespace)` and the send flow
    // renders an empty list.
    const assets = selectAccountGroupAssets(buildState(), undefined);

    expect(assets.every((asset) => asset.accountType === ACCOUNT_TYPE)).toBe(
      true,
    );
  });

  it('treats balance amounts as human-readable, not raw base units', () => {
    // Regression: `assetsBalance[].amount` is already decimal despite the
    // controller type implying raw units. Dividing by 10**decimals made every
    // balance ~1e-18 of its true value.
    const assets = selectAccountGroupAssets(buildState(), undefined);

    const eth = assets.find(
      (asset) => asset.symbol === 'ETH' && asset.isNative,
    );

    expect(eth).toBeDefined();
    expect(Number(eth?.balance)).toBeGreaterThan(1e-9);
  });

  it('derives rawBalance as an exact base-unit integer', () => {
    // `usePayTokenAccountBalance` runs `new BigNumber(rawBalance)`, so this
    // must parse and must not be undefined.
    const assets = selectAccountGroupAssets(buildState(), undefined);

    const withBalance = assets.find((asset) => Number(asset.balance) > 0);

    expect(withBalance?.rawBalance).toMatch(/^0x[0-9a-f]+$/u);
  });

  it('gives native EVM assets the native token address, not an empty string', () => {
    const assets = selectAccountGroupAssets(buildState(), undefined);

    const native = assets.find((asset) => asset.isNative && asset.isETH);

    expect(native?.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
    expect(native?.key).toBe(
      `${native?.chainId?.toLowerCase()}:${native?.address?.toLowerCase()}`,
    );
  });

  it('sorts by fiat balance descending', () => {
    const assets = selectAccountGroupAssets(buildState(), undefined);
    const sortKeys = assets.map((asset) => asset.sortKey);

    expect(sortKeys).toStrictEqual([...sortKeys].sort((a, b) => b - a));
  });

  it('excludes assets hidden via assetPreferences', () => {
    const assetsController = (
      fixture as unknown as {
        AssetsController: {
          assetsBalance: Record<string, Record<string, unknown>>;
        };
      }
    ).AssetsController;

    const before = selectAccountGroupAssets(buildState(), undefined);

    // `assetPreferences` is keyed by CAIP-19 ID, whereas the decorated
    // `assetId` is the hex address for EVM assets, so the key must come
    // straight from the balance map.
    const caipId = Object.keys(
      Object.values(assetsController.assetsBalance)[0],
    )[0];

    const hiddenState = buildState({
      AssetsController: {
        ...assetsController,
        assetPreferences: { [caipId]: { hidden: true } },
      },
    });

    const after = selectAccountGroupAssets(hiddenState, undefined);

    expect(after.length).toBe(before.length - 1);
  });

  it('returns the same reference for repeated calls with equal state', () => {
    // The entire point of the selector: 53 hook instances share one result.
    const state = buildState();

    expect(selectAccountGroupAssets(state, undefined)).toBe(
      selectAccountGroupAssets(state, undefined),
    );
  });
});

describe('selectAccountGroupAssetBalance', () => {
  it('reads the balance without computing the decorated asset list', () => {
    const state = buildBalanceState();
    const recomputations = selectAccountGroupAssets.recomputations();

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toStrictEqual({ decimals: 6, rawBalance: '0xf4241' });
    expect(selectAccountGroupAssets.recomputations()).toBe(recomputations);
  });

  it('reads keyed entries without enumerating the account assets or metadata', () => {
    const state = buildBalanceState();
    const assetsController = state.engine.backgroundState.AssetsController;
    const forbidEnumeration = {
      ownKeys() {
        throw new Error('Single-asset balance reads must not enumerate assets');
      },
    };
    assetsController.assetsBalance[ACCOUNT_ID] = new Proxy(
      assetsController.assetsBalance[ACCOUNT_ID],
      forbidEnumeration,
    );
    assetsController.assetsInfo = new Proxy(
      assetsController.assetsInfo,
      forbidEnumeration,
    );

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toStrictEqual({ decimals: 6, rawBalance: '0xf4241' });
  });

  it('matches a checksummed token address and preserves six-decimal precision', () => {
    const state = buildBalanceState();

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS.toLowerCase(),
    );

    expect(balance).toStrictEqual({ decimals: 6, rawBalance: '0xf4241' });
  });

  it('reads native balances without losing eighteen-decimal precision', () => {
    const state = buildBalanceState();

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      '0x1',
      getNativeTokenAddress('0x1'),
    );

    expect(balance).toStrictEqual({
      decimals: 18,
      rawBalance: '0x1bc16d674ec80001',
    });
  });

  it('resolves native asset IDs from network enablement for custom chains', () => {
    const state = cloneDeep(buildBalanceState());
    const chainId = '0xf00';
    const assetId = 'eip155:3840/slip44:999777';
    const background = state.engine.backgroundState;
    background.NetworkEnablementController = {
      ...background.NetworkEnablementController,
      nativeAssetIdentifiers: { 'eip155:3840': assetId },
    };
    background.AssetsController.assetsInfo[assetId] = {
      decimals: 18,
      name: 'Custom native token',
      symbol: 'CUSTOM',
      type: 'native',
    };
    background.AssetsController.assetsBalance[ACCOUNT_ID][assetId] = {
      amount: '2.000000000000000001',
    };

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      chainId,
      getNativeTokenAddress(chainId),
    );

    expect(balance).toStrictEqual({
      decimals: 18,
      rawBalance: '0x1bc16d674ec80001',
    });
  });

  it('does not match the same address on another chain', () => {
    const state = buildBalanceState();

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      '0x1',
      TOKEN_ADDRESS,
    );

    expect(balance).toBeUndefined();
  });

  it('returns undefined when no token is selected', () => {
    const state = buildBalanceState();

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      undefined,
      undefined,
    );

    expect(balance).toBeUndefined();
  });

  it('returns a live zero balance rather than a missing balance', () => {
    const state = buildBalanceState('0');

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toStrictEqual({ decimals: 6, rawBalance: '0x0' });
  });

  it('returns undefined when the asset has no usable raw balance', () => {
    const state = buildBalanceState('NaN');

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toBeUndefined();
  });

  it('returns undefined when the asset has no metadata', () => {
    const state = cloneDeep(buildBalanceState());
    delete state.engine.backgroundState.AssetsController.assetsInfo[
      TOKEN_ASSET_ID
    ];

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toBeUndefined();
  });

  it('preserves token-list exclusion of hidden assets', () => {
    const state = buildBalanceState();
    state.engine.backgroundState.AssetsController.assetPreferences = {
      [TOKEN_ASSET_ID]: { hidden: true },
    };

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toBeUndefined();
  });

  it('preserves the balance reference when another asset balance changes', () => {
    const state = buildBalanceState();
    const initial = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );
    const nextState = buildBalanceState('1.000001', '3');

    const updated = selectAccountGroupAssetBalance(
      nextState,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(initial).toBeDefined();
    expect(updated).toBe(initial);
  });

  it('returns the updated balance after an asset poll', () => {
    const state = buildBalanceState();
    const initial = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );
    const nextState = buildBalanceState('2');

    const updated = selectAccountGroupAssetBalance(
      nextState,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(updated).not.toBe(initial);
    expect(updated).toStrictEqual({ decimals: 6, rawBalance: '0x1e8480' });
  });

  it('reads the override group instead of the selected group', () => {
    const state = cloneDeep(buildBalanceState());
    const { accountTree } = state.engine.backgroundState.AccountTreeController;
    const wallet = Object.values(accountTree.wallets)[0];
    const group = Object.values(wallet.groups)[0];
    const overrideAccountId = group.accounts[1];
    const overrideGroupId = `${wallet.id}/1` as AccountGroupId;
    wallet.groups[overrideGroupId] = {
      ...group,
      accounts: [overrideAccountId],
      id: overrideGroupId,
    };
    group.accounts = [ACCOUNT_ID];
    state.engine.backgroundState.AssetsController.assetsBalance[
      overrideAccountId
    ] = { [TOKEN_ASSET_ID]: { amount: '3' } };

    const selectedBalance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );
    const overrideBalance = selectAccountGroupAssetBalance(
      state,
      overrideGroupId,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(selectedBalance).toStrictEqual({
      decimals: 6,
      rawBalance: '0xf4241',
    });
    expect(overrideBalance).toStrictEqual({
      decimals: 6,
      rawBalance: '0x2dc6c0',
    });
  });

  it('does not fall back to selected assets for an unknown override group', () => {
    const state = buildBalanceState();

    const balance = selectAccountGroupAssetBalance(
      state,
      'entropy:missing/0',
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );

    expect(balance).toBeUndefined();
  });

  it('matches the token list when several accounts hold the same asset', () => {
    const state = cloneDeep(buildBalanceState());
    const { accountTree } = state.engine.backgroundState.AccountTreeController;
    const wallet = Object.values(accountTree.wallets)[0];
    const secondAccountId = Object.values(wallet.groups)[0].accounts[1];
    const assetsController = state.engine.backgroundState.AssetsController;
    assetsController.assetsBalance[secondAccountId] = {
      [TOKEN_ASSET_ID]: { amount: '3' },
    };
    assetsController.assetsPrice[TOKEN_ASSET_ID] = {
      ...assetsController.assetsPrice[TOKEN_ASSET_ID],
      price: 1,
    };

    const balance = selectAccountGroupAssetBalance(
      state,
      undefined,
      TOKEN_CHAIN_ID,
      TOKEN_ADDRESS,
    );
    const listedAsset = selectAccountGroupAssets(state, undefined).find(
      (asset) =>
        asset.address === TOKEN_ADDRESS && asset.chainId === TOKEN_CHAIN_ID,
    );

    expect(balance).toStrictEqual({ decimals: 6, rawBalance: '0x2dc6c0' });
    expect(balance?.rawBalance).toBe(listedAsset?.rawBalance);
  });
});

function buildBalanceState(
  amount = '1.000001',
  nativeAmount = '2.000000000000000001',
): RootState {
  return buildState({
    AssetsController: {
      ...fixture.AssetsController,
      assetsBalance: {
        [ACCOUNT_ID]: {
          [TOKEN_ASSET_ID]: { amount },
          [NATIVE_ASSET_ID]: { amount: nativeAmount },
        },
      },
    },
  });
}
