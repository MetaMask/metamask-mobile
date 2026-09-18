import { backgroundState } from '../../../../util/test/initial-root-state';
import type { RootState } from '../../../../reducers';
import fixture from '../../../../selectors/assets/__fixtures__/assets-controller-state-log.json';
import { selectConfirmationAssetsByAccountGroupId } from './assets';

const ACCOUNT_TYPE = 'eip155:eoa';

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

  it('returns the same reference for repeated calls with equal state', () => {
    // The entire point of the selector: 53 hook instances share one result.
    const state = buildState();

    expect(selectConfirmationAssetsByAccountGroupId(state, undefined)).toBe(
      selectConfirmationAssetsByAccountGroupId(state, undefined),
    );
  });
});
