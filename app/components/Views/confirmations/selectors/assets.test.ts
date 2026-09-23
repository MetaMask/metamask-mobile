import { backgroundState } from '../../../../util/test/initial-root-state';
import type { RootState } from '../../../../reducers';
import fixture from '../../../../selectors/assets/__fixtures__/assets-controller-state-log.json';
import { ARC_USDC_ERC20_TOKEN_ADDRESS } from '../../../../enablement/assets/networks-customization';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { KnownCaip19Id } from '../../../../core/Multichain/constants';
import { SolScope } from '@metamask/keyring-api';
import {
  selectConfirmationAssetsByAccountGroupId,
  selectConfirmationAssetsWithBalanceByAccountGroupId,
  type ConfirmationAsset,
} from './assets';

// Formatting is exercised by the util's own suite; stubbed here so assertions
// can target the amount and currency that reach it rather than locale output.
jest.mock('../utils/fiat', () => ({
  formatFiat: jest.fn((amount?: number, currency?: string) =>
    amount === undefined ? undefined : `${currency}:${amount}`,
  ),
}));

const ACCOUNT_TYPE = 'eip155:eoa';

// Mainnet USDC. On the default stablecoin list, so it exercises the bypass.
// Base USDC is not on that list, so it exercises the plain `usdPrice` path.
const MAINNET_USDC_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

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

function buildState(
  overrides: Record<string, unknown> = {},
  settings: Record<string, unknown> = { showFiatOnTestnets: true },
): RootState {
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
    settings,
  } as unknown as RootState;
}

/** Seeds extra assets onto the first account that already holds balances. */
function buildStateWithAssets(
  seeds: {
    amount: string;
    assetId: string;
    info: Record<string, unknown>;
    price?: Record<string, unknown>;
  }[],
  settings?: Record<string, unknown>,
): RootState {
  const assetsController = (
    fixture as unknown as {
      AssetsController: {
        assetsBalance: Record<string, Record<string, unknown>>;
        assetsInfo: Record<string, unknown>;
        assetsPrice: Record<string, unknown>;
      };
    }
  ).AssetsController;

  const accountId = Object.keys(assetsController.assetsBalance)[0];

  return buildState(
    {
      AssetsController: {
        ...assetsController,
        assetsBalance: {
          ...assetsController.assetsBalance,
          [accountId]: {
            ...assetsController.assetsBalance[accountId],
            ...Object.fromEntries(
              seeds.map((seed) => [seed.assetId, { amount: seed.amount }]),
            ),
          },
        },
        assetsInfo: {
          ...assetsController.assetsInfo,
          ...Object.fromEntries(seeds.map((seed) => [seed.assetId, seed.info])),
        },
        assetsPrice: {
          ...assetsController.assetsPrice,
          ...Object.fromEntries(
            seeds
              .filter((seed) => seed.price)
              .map((seed) => [seed.assetId, seed.price]),
          ),
        },
      },
    },
    settings,
  );
}

/**
 * These tests run against a real logged `AssetsController` state dump rather
 * than hand-written fixtures. Hand-written state hides shape mismatches — the
 * decimal-scaling and missing-`accountType` bugs both passed synthetic tests
 * and only surfaced against real data.
 */

describe('selectConfirmationAssetsByAccountGroupId', () => {
  it('returns assets for the selected account group', () => {
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

    expect(assets.length).toBeGreaterThan(0);
  });

  it('sets accountType on every asset', () => {
    // Regression: without `accountType`, `useSendTokens` filters out every
    // token via `token.accountType?.includes(namespace)` and the send flow
    // renders an empty list.
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

    expect(assets.every((asset) => asset.accountType === ACCOUNT_TYPE)).toBe(
      true,
    );
  });

  it('treats balance amounts as human-readable, not raw base units', () => {
    // Regression: `assetsBalance[].amount` is already decimal despite the
    // controller type implying raw units. Dividing by 10**decimals made every
    // balance ~1e-18 of its true value.
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

    const eth = assets.find(
      (asset) => asset.symbol === 'ETH' && asset.isNative,
    );

    expect(eth).toBeDefined();
    expect(Number(eth?.balance)).toBeGreaterThan(1e-9);
  });

  it('derives rawBalance as an exact base-unit integer', () => {
    // `usePayTokenAccountBalance` runs `new BigNumber(rawBalance)`, so this
    // must parse and must not be undefined.
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

    const withBalance = assets.find((asset) => Number(asset.balance) > 0);

    expect(withBalance?.rawBalance).toMatch(/^0x[0-9a-f]+$/u);
  });

  it('gives native EVM assets the native token address, not an empty string', () => {
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

    const native = assets.find((asset) => asset.isNative && asset.isETH);

    expect(native?.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
    expect(native?.key).toBe(
      `${native?.chainId?.toLowerCase()}:${native?.address?.toLowerCase()}`,
    );
  });

  it('sorts by fiat balance descending', () => {
    const assets = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );
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

    const before = selectConfirmationAssetsByAccountGroupId(
      buildState(),
      undefined,
    );

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

    const after = selectConfirmationAssetsByAccountGroupId(
      hiddenState,
      undefined,
    );

    expect(after.length).toBe(before.length - 1);
  });

  it('excludes ERC-20s that duplicate the chain native gas token', () => {
    // Arc exposes USDC both as the native gas token and as an ERC-20 backed
    // by the same balance, so including both double-counts the holding.
    const assetsController = (
      fixture as unknown as {
        AssetsController: {
          assetsBalance: Record<string, Record<string, unknown>>;
          assetsInfo: Record<string, unknown>;
        };
      }
    ).AssetsController;

    const accountId = Object.keys(assetsController.assetsBalance)[0];
    const nativeAssetId = `eip155:5042/slip44:60`;
    const erc20AssetId = `eip155:5042/erc20:${ARC_USDC_ERC20_TOKEN_ADDRESS}`;
    const metadata = { symbol: 'USDC', name: 'USDC', decimals: 6, image: '' };

    const state = buildState({
      AssetsController: {
        ...assetsController,
        assetsBalance: {
          ...assetsController.assetsBalance,
          [accountId]: {
            ...assetsController.assetsBalance[accountId],
            [nativeAssetId]: { amount: '5' },
            [erc20AssetId]: { amount: '5' },
          },
        },
        assetsInfo: {
          ...assetsController.assetsInfo,
          [nativeAssetId]: { ...metadata, type: 'native' },
          [erc20AssetId]: { ...metadata, type: 'erc20' },
        },
      },
    });

    const arcAssets = selectConfirmationAssetsByAccountGroupId(
      state,
      undefined,
    ).filter((asset) => asset.chainId === NETWORKS_CHAIN_ID.ARC);

    expect(arcAssets).toHaveLength(1);
    expect(arcAssets[0].isNative).toBe(true);
  });

  // `assetId` on an emitted asset is the address for EVM chains and the
  // CAIP-19 ID only for non-EVM, so each case matches on its own terms.
  it.each([
    {
      assetId: KnownCaip19Id.TrxStakedForEnergyMainnet as string,
      label: 'Tron network resources',
      matches: (asset: ConfirmationAsset) =>
        asset.assetId === KnownCaip19Id.TrxStakedForEnergyMainnet,
      metadata: { symbol: 'TRX', name: 'Energy', decimals: 6, image: '' },
    },
    {
      assetId: 'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df',
      label: 'the pooled-staking vault token',
      matches: (asset: ConfirmationAsset) =>
        asset.chainId === '0x1' &&
        asset.address?.toLowerCase() ===
          '0x4fef9d741011476750a243ac70b9789a63dd47df',
      metadata: {
        symbol: 'mETH',
        name: 'Staked Ethereum',
        decimals: 18,
        image: '',
      },
    },
    {
      assetId: 'eip155:4217/slip44:60',
      label: 'native tokens on chains that have none',
      matches: (asset: ConfirmationAsset) => asset.chainId === '0x1079',
      metadata: { symbol: 'TEMPO', name: 'Tempo', decimals: 18, image: '' },
    },
  ])('excludes $label', ({ assetId, matches, metadata }) => {
    const assetsController = (
      fixture as unknown as {
        AssetsController: {
          assetsBalance: Record<string, Record<string, unknown>>;
          assetsInfo: Record<string, unknown>;
        };
      }
    ).AssetsController;

    const accountId = Object.keys(assetsController.assetsBalance)[0];

    const state = buildState({
      AssetsController: {
        ...assetsController,
        assetsBalance: {
          ...assetsController.assetsBalance,
          [accountId]: {
            ...assetsController.assetsBalance[accountId],
            [assetId]: { amount: '5' },
          },
        },
        assetsInfo: {
          ...assetsController.assetsInfo,
          [assetId]: metadata,
        },
      },
    });

    const assets = selectConfirmationAssetsByAccountGroupId(state, undefined);

    expect(assets.find(matches)).toBeUndefined();
  });

  describe('testnet fiat', () => {
    // Solana Devnet is non-EVM, so its chain ID never reaches the selector in
    // hex form. A hex-only testnet check silently treats it as mainnet.
    const DEVNET_SOL = `${SolScope.Devnet}/slip44:501`;

    const seeds = [
      {
        amount: '2',
        assetId: DEVNET_SOL,
        info: { symbol: 'SOL', name: 'Solana', decimals: 9, image: '' },
        price: { id: DEVNET_SOL, price: 80, currency: 'chf' },
      },
    ];

    function findDevnetSol(showFiatOnTestnets: boolean) {
      const assets = selectConfirmationAssetsByAccountGroupId(
        buildStateWithAssets(seeds, { showFiatOnTestnets }),
        undefined,
      );

      return assets.find((asset) => asset.assetId === DEVNET_SOL);
    }

    it('hides fiat for non-EVM testnets when the setting is off', () => {
      const asset = findDevnetSol(false);

      expect(asset).toBeDefined();
      expect(asset?.balanceInSelectedCurrency).toBeUndefined();
      expect(asset?.fiat).toBeUndefined();
      expect(asset?.sortKey).toBe(0);
    });

    it('shows fiat for non-EVM testnets when the setting is on', () => {
      const asset = findDevnetSol(true);

      expect(asset?.fiat?.balance).toBe(160);
      expect(asset?.sortKey).toBe(160);
    });
  });

  describe('zero balances', () => {
    // A zero balance is worth zero in every currency, so it must still render
    // a fiat value even when no price is available for the token.
    const PRICELESS_TOKEN =
      'eip155:1/erc20:0x1111111111111111111111111111111111111111';

    const seed = (amount: string) => [
      {
        amount,
        assetId: PRICELESS_TOKEN,
        info: { symbol: 'ZERO', name: 'Zero', decimals: 18, image: '' },
      },
    ];

    function findPricelessToken(amount: string) {
      const assets = selectConfirmationAssetsByAccountGroupId(
        buildStateWithAssets(seed(amount)),
        undefined,
      );

      return assets.find(
        (asset) =>
          asset.address?.toLowerCase() ===
          '0x1111111111111111111111111111111111111111',
      );
    }

    it('displays zero fiat for a zero balance with no price', () => {
      expect(findPricelessToken('0')?.balanceInSelectedCurrency).toBe('chf:0');
    });

    it('displays no fiat for a non-zero balance with no price', () => {
      expect(
        findPricelessToken('5')?.balanceInSelectedCurrency,
      ).toBeUndefined();
    });
  });

  describe('currency override', () => {
    // Base USDC in the fixture: 49.933153 tokens, 0.8153… CHF, 1.0018… USD.
    const BALANCE = 49.933153;
    const PREFERRED_RATE = 0.815354205730783;
    const USD_RATE = 1.0018133229553854;

    function findBaseUsdc(currencyOverride?: string) {
      return selectConfirmationAssetsByAccountGroupId(
        buildState(),
        undefined,
        currencyOverride,
      ).find(
        (asset) =>
          asset.symbol === 'USDC' && asset.chainId === NETWORKS_CHAIN_ID.BASE,
      );
    }

    it('formats the balance in the preferred currency when not overridden', () => {
      expect(findBaseUsdc()?.balanceInSelectedCurrency).toBe(
        `chf:${BALANCE * PREFERRED_RATE}`,
      );
    });

    it('formats the balance from usdPrice when overridden to USD', () => {
      // Regression guard: falling back to `price` here would label a
      // CHF amount with a dollar sign.
      expect(findBaseUsdc('USD')?.balanceInSelectedCurrency).toBe(
        `USD:${BALANCE * USD_RATE}`,
      );
    });

    it('keeps fiat in the preferred currency when overridden', () => {
      // `fiat` drives sorting and the account-level totals, which stay in the
      // user's chosen currency regardless of what the pay flow displays.
      expect(findBaseUsdc('USD')?.fiat).toStrictEqual({
        balance: BALANCE * PREFERRED_RATE,
        conversionRate: PREFERRED_RATE,
        currency: 'chf',
      });
    });

    it('pins stablecoins to exactly 1 USD when overridden', () => {
      // The price API drifts around the peg; the pay flow quotes against 1:1.
      const assetsController = (
        fixture as unknown as {
          AssetsController: {
            assetsBalance: Record<string, Record<string, unknown>>;
          };
        }
      ).AssetsController;

      const accountId = Object.keys(assetsController.assetsBalance)[0];

      const state = buildState({
        AssetsController: {
          ...assetsController,
          assetsBalance: {
            ...assetsController.assetsBalance,
            [accountId]: {
              ...assetsController.assetsBalance[accountId],
              [MAINNET_USDC_ASSET_ID]: { amount: '100' },
            },
          },
        },
      });

      const mainnetUsdc = selectConfirmationAssetsByAccountGroupId(
        state,
        undefined,
        'USD',
      ).find(
        (asset) =>
          asset.symbol === 'USDC' &&
          asset.chainId === NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(mainnetUsdc?.balanceInSelectedCurrency).toBe('USD:100');
    });
  });

  it('returns the same reference for repeated calls with equal state', () => {
    // The entire point of the selector: 53 hook instances share one result.
    const state = buildState();

    expect(selectConfirmationAssetsByAccountGroupId(state, undefined)).toBe(
      selectConfirmationAssetsByAccountGroupId(state, undefined),
    );
  });
});

describe('selectConfirmationAssetsWithBalanceByAccountGroupId', () => {
  const ZERO_TOKEN =
    'eip155:1/erc20:0x2222222222222222222222222222222222222222';
  const ZERO_ADDRESS = '0x2222222222222222222222222222222222222222';

  it('excludes assets with no balance', () => {
    const state = buildStateWithAssets([
      {
        amount: '0',
        assetId: ZERO_TOKEN,
        info: { symbol: 'ZERO', name: 'Zero', decimals: 18, image: '' },
      },
    ]);

    const all = selectConfirmationAssetsByAccountGroupId(state, undefined);
    const withBalance = selectConfirmationAssetsWithBalanceByAccountGroupId(
      state,
      undefined,
    );

    const matches = (asset: ConfirmationAsset) =>
      asset.address?.toLowerCase() === ZERO_ADDRESS;

    expect(all.find(matches)).toBeDefined();
    expect(withBalance.find(matches)).toBeUndefined();
  });

  it('keeps assets holding a balance but carrying no fiat value', () => {
    const state = buildStateWithAssets([
      {
        amount: '7',
        assetId: ZERO_TOKEN,
        info: { symbol: 'ZERO', name: 'Zero', decimals: 18, image: '' },
      },
    ]);

    const asset = selectConfirmationAssetsWithBalanceByAccountGroupId(
      state,
      undefined,
    ).find((entry) => entry.address?.toLowerCase() === ZERO_ADDRESS);

    expect(asset).toBeDefined();
    expect(asset?.fiat).toBeUndefined();
  });

  it('returns the base array untouched when nothing is filtered', () => {
    const assetsController = (
      fixture as unknown as {
        AssetsController: { assetsBalance: Record<string, unknown> };
      }
    ).AssetsController;

    const accountId = Object.keys(assetsController.assetsBalance)[0];
    const assetId = 'eip155:1/erc20:0x3333333333333333333333333333333333333333';

    // Only a single funded asset, so the filter removes nothing and the base
    // array must be passed straight through rather than copied.
    const state = buildState({
      AssetsController: {
        ...assetsController,
        assetsBalance: { [accountId]: { [assetId]: { amount: '3' } } },
        assetsInfo: {
          [assetId]: {
            symbol: 'FUND',
            name: 'Funded',
            decimals: 18,
            image: '',
          },
        },
      },
    });

    const all = selectConfirmationAssetsByAccountGroupId(state, undefined);

    expect(all).toHaveLength(1);
    expect(
      selectConfirmationAssetsWithBalanceByAccountGroupId(state, undefined),
    ).toBe(all);
  });

  it('returns the same reference for repeated calls with equal state', () => {
    // Downstream memos depend on this: a fresh array per call would
    // invalidate them on every render.
    const state = buildState();

    expect(
      selectConfirmationAssetsWithBalanceByAccountGroupId(state, undefined),
    ).toBe(
      selectConfirmationAssetsWithBalanceByAccountGroupId(state, undefined),
    );
  });
});
