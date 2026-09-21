import { backgroundState } from '../../../../util/test/initial-root-state';
import type { RootState } from '../../../../reducers';
import fixture from '../../../../selectors/assets/__fixtures__/assets-controller-state-log.json';
import { ARC_USDC_ERC20_TOKEN_ADDRESS } from '../../../../enablement/assets/networks-customization';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { selectConfirmationAssetsByAccountGroupId } from './assets';

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
