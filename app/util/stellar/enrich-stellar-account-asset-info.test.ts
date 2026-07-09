///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../core/Engine';
import { requestStellarGetAccountAssetInfo } from './stellar-snap-client-requests';
import {
  enrichStellarAccountAssetInfo,
  findAccountsNeedingStellarEnrichment,
  isStellarClassicAssetId,
  listStellarClassicAssetIdsForAccount,
  resetStellarAccountAssetInfoEnrichmentInFlight,
} from './enrich-stellar-account-asset-info';

jest.mock('../../core/Engine', () => ({
  context: {
    AssetsController: {
      state: {
        assetsBalance: {},
      },
      getCustomAssets: jest.fn().mockReturnValue([]),
      handleAssetsUpdate: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('./stellar-snap-client-requests', () => ({
  requestStellarGetAccountAssetInfo: jest.fn(),
}));

const STELLAR_USDC =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const STELLAR_XLM = 'stellar:pubnet/slip44:148';
const SOLANA_SOL = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

describe('enrich-stellar-account-asset-info', () => {
  const account = { id: 'account-1' } as InternalAccount;
  const assetsController = Engine.context.AssetsController as {
    state: {
      assetsBalance: Record<
        string,
        Record<string, { amount?: string; accountAssetInfo?: unknown }>
      >;
    };
    getCustomAssets: jest.Mock;
    handleAssetsUpdate: jest.Mock;
  };
  const requestMock = requestStellarGetAccountAssetInfo as jest.MockedFunction<
    typeof requestStellarGetAccountAssetInfo
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    resetStellarAccountAssetInfoEnrichmentInFlight();
    assetsController.state.assetsBalance = {
      'account-1': {
        [STELLAR_USDC]: { amount: '10' },
        [STELLAR_XLM]: { amount: '1' },
      },
    };
    assetsController.getCustomAssets.mockReturnValue([]);
  });

  describe('isStellarClassicAssetId', () => {
    it('returns true for Stellar classic assets', () => {
      expect(isStellarClassicAssetId(STELLAR_USDC)).toBe(true);
    });

    it('returns false for native XLM and non-Stellar assets', () => {
      expect(isStellarClassicAssetId(STELLAR_XLM)).toBe(false);
      expect(isStellarClassicAssetId(SOLANA_SOL)).toBe(false);
    });
  });

  describe('listStellarClassicAssetIdsForAccount', () => {
    it('lists classic assets from balances and optional custom assets', () => {
      assetsController.getCustomAssets.mockReturnValue([
        'stellar:pubnet/asset:EURC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      ]);

      expect(
        listStellarClassicAssetIdsForAccount('account-1', 'stellar:pubnet', {
          includeCustomAssets: true,
        }),
      ).toStrictEqual([
        STELLAR_USDC,
        'stellar:pubnet/asset:EURC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      ]);
    });
  });

  describe('findAccountsNeedingStellarEnrichment', () => {
    it('returns classic assets missing accountAssetInfo', () => {
      const result = findAccountsNeedingStellarEnrichment({
        'account-1': {
          [STELLAR_USDC]: { amount: '10' },
          [STELLAR_XLM]: { amount: '1' },
          [SOLANA_SOL]: { amount: '2' },
        },
      });

      expect(result.get('account-1')?.get('stellar:pubnet')).toStrictEqual([
        STELLAR_USDC,
      ]);
    });

    it('skips assets that already have accountAssetInfo', () => {
      const result = findAccountsNeedingStellarEnrichment({
        'account-1': {
          [STELLAR_USDC]: {
            amount: '10',
            accountAssetInfo: { limit: '1000' },
          },
        },
      });

      expect(result.size).toBe(0);
    });
  });

  describe('enrichStellarAccountAssetInfo', () => {
    it('merges Snap enrichment into AssetsController balances', async () => {
      requestMock.mockResolvedValueOnce({
        [STELLAR_USDC]: { limit: '1000', authorized: true },
      });

      await enrichStellarAccountAssetInfo({
        account,
        chainId: 'stellar:pubnet',
        assetIds: [STELLAR_USDC],
      });

      expect(requestMock).toHaveBeenCalledWith({
        accountId: 'account-1',
        scope: 'stellar:pubnet',
        assets: [STELLAR_USDC],
      });
      expect(assetsController.handleAssetsUpdate).toHaveBeenCalledWith(
        {
          updateMode: 'merge',
          assetsBalance: {
            'account-1': {
              [STELLAR_USDC]: {
                amount: '10',
                accountAssetInfo: { limit: '1000', authorized: true },
              },
            },
          },
        },
        'StellarAccountAssetInfoEnrichment',
      );
    });

    it('dedupes concurrent enrich calls for the same account and chain', async () => {
      let resolveRequest:
        | ((value: Record<string, Record<string, unknown>>) => void)
        | undefined;
      requestMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }),
      );

      const first = enrichStellarAccountAssetInfo({
        account,
        chainId: 'stellar:pubnet',
        assetIds: [STELLAR_USDC],
      });
      const second = enrichStellarAccountAssetInfo({
        account,
        chainId: 'stellar:pubnet',
        assetIds: [STELLAR_USDC],
      });

      resolveRequest?.({
        [STELLAR_USDC]: { limit: '1000', authorized: true },
      });
      await Promise.all([first, second]);

      expect(requestMock).toHaveBeenCalledTimes(1);
    });
  });
});
///: END:ONLY_INCLUDE_IF
