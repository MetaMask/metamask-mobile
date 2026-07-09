///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { startStellarAccountAssetInfoEnrichmentBridge } from './stellar-account-asset-info-enrichment-bridge';
import {
  enrichAllStellarClassicAccountAssetInfo,
  enrichStellarAccountAssetInfo,
  findAccountsNeedingStellarEnrichment,
} from '../../../util/stellar/enrich-stellar-account-asset-info';

jest.mock('../../../util/stellar/enrich-stellar-account-asset-info', () => ({
  enrichAllStellarClassicAccountAssetInfo: jest
    .fn()
    .mockResolvedValue(undefined),
  enrichStellarAccountAssetInfo: jest.fn().mockResolvedValue(undefined),
  findAccountsNeedingStellarEnrichment: jest.fn().mockReturnValue(new Map()),
  isStellarClassicAssetId: jest.requireActual(
    '../../../util/stellar/enrich-stellar-account-asset-info',
  ).isStellarClassicAssetId,
}));

const STELLAR_USDC =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const SOLANA_SOL = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

describe('startStellarAccountAssetInfoEnrichmentBridge', () => {
  function setup({ enabled = true }: { enabled?: boolean } = {}) {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const messenger = {
      subscribe: jest.fn(
        (event: string, callback: (...args: unknown[]) => unknown) => {
          handlers.set(event, callback);
        },
      ),
      unsubscribe: jest.fn(),
    };
    const account = { id: 'account-1' };
    const accountsController = {
      getAccount: jest.fn().mockReturnValue(account),
    };

    const cleanup = startStellarAccountAssetInfoEnrichmentBridge({
      messenger: messenger as never,
      accountsController: accountsController as never,
      isEnabled: () => enabled,
    });

    return {
      handlers,
      messenger,
      accountsController,
      account,
      cleanup,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enriches Stellar assets after asset list updates', async () => {
    const { handlers, accountsController, account } = setup();
    const listHandler = handlers.get(
      'AccountsController:accountAssetListUpdated',
    ) as (payload: {
      assets: Record<string, { added: string[]; removed: string[] }>;
    }) => Promise<void>;

    await listHandler({
      assets: {
        'account-1': {
          added: [STELLAR_USDC, SOLANA_SOL],
          removed: [],
        },
      },
    });

    expect(accountsController.getAccount).toHaveBeenCalledWith('account-1');
    expect(enrichAllStellarClassicAccountAssetInfo).toHaveBeenCalledWith(
      account,
      'stellar:pubnet',
      { force: true },
    );
  });

  it('does nothing for asset list updates when disabled', async () => {
    const { handlers } = setup({ enabled: false });
    const listHandler = handlers.get(
      'AccountsController:accountAssetListUpdated',
    ) as (payload: {
      assets: Record<string, { added: string[]; removed: string[] }>;
    }) => Promise<void>;

    await listHandler({
      assets: {
        'account-1': {
          added: [STELLAR_USDC],
          removed: [],
        },
      },
    });

    expect(enrichAllStellarClassicAccountAssetInfo).not.toHaveBeenCalled();
  });

  it('enriches missing accountAssetInfo after AssetsController state changes', async () => {
    const needing = new Map([
      ['account-1', new Map([['stellar:pubnet' as const, [STELLAR_USDC]]])],
    ]);
    jest.mocked(findAccountsNeedingStellarEnrichment).mockReturnValue(needing);

    const { handlers, account } = setup();
    const stateHandler = handlers.get('AssetsController:stateChange') as (
      state: unknown,
    ) => void;

    stateHandler({
      assetsBalance: {
        'account-1': {
          [STELLAR_USDC]: { amount: '10' },
        },
      },
    });

    await jest.runAllTimersAsync();

    expect(enrichStellarAccountAssetInfo).toHaveBeenCalledWith({
      account,
      chainId: 'stellar:pubnet',
      assetIds: [STELLAR_USDC],
    });
  });

  it('unsubscribes both handlers on cleanup', () => {
    const { cleanup, messenger } = setup();

    cleanup();

    expect(messenger.unsubscribe).toHaveBeenCalledWith(
      'AccountsController:accountAssetListUpdated',
      expect.any(Function),
    );
    expect(messenger.unsubscribe).toHaveBeenCalledWith(
      'AssetsController:stateChange',
      expect.any(Function),
    );
  });
});
///: END:ONLY_INCLUDE_IF
