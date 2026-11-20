import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

export const TRON_MAINNET = 'tron:728126428';
export const TRON_NATIVE_ASSET_ID = `${TRON_MAINNET}/slip44:195`;
export const TRON_ACCOUNT_ID = 'acc-1';

interface TronStakedAssetsStateOptions {
  /** Raw TRX-denominated staking energy amount (SUN). */
  stakedEnergy?: string;
  /** Liquid TRX balance for the native asset. */
  liquidBalance?: string;
  trxPrice?: number;
}

/**
 * Selected account group with one Tron account that has 0 liquid TRX and
 * staking metadata, matching the state a staked-TRX row is rendered from.
 */
export const buildTronStakedAssetsState = ({
  stakedEnergy = '7000000',
  liquidBalance = '0',
  trxPrice = 0.12,
}: TronStakedAssetsStateOptions = {}): DeepPartial<RootState> =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork()
    .withMinimalKeyringController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalAnalyticsController()
    .withMinimalEarnController()
    .withMinimalTokensController()
    .withAccountTreeForSelectedAccount()
    .withPreferences({
      useSafeChainsListValidation: false,
      useTokenDetection: false,
      ipfsGateway: '',
    })
    .withRemoteFeatureFlags({})
    .withOverrides({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [TRON_ACCOUNT_ID]: {
                  id: TRON_ACCOUNT_ID,
                  address: 'TQ5NMqJjvHw5Hh4k7sXoB8mZ1uY2rW3nVc',
                  type: 'tron:eoa',
                  options: { scope: TRON_MAINNET },
                  methods: ['signMessage', 'signTransaction'],
                  scopes: [TRON_MAINNET],
                  metadata: {
                    name: 'Tron Account',
                    importTime: 1754312681246,
                    keyring: { type: 'Snap Keyring' },
                  },
                },
              },
              selectedAccount: TRON_ACCOUNT_ID,
            },
          },
          AssetsController: {
            selectedCurrency: 'usd',
            assets: {},
            assetsInfo: {
              [TRON_NATIVE_ASSET_ID]: {
                type: 'native',
                symbol: 'TRX',
                name: 'TRON',
                decimals: 6,
              },
            },
            assetsBalance: {
              [TRON_ACCOUNT_ID]: {
                [TRON_NATIVE_ASSET_ID]: {
                  amount: liquidBalance,
                  metadata: { staking: { energy: stakedEnergy } },
                },
              },
            },
            assetsPrice: {
              [TRON_NATIVE_ASSET_ID]: {
                assetPriceType: 'fungible',
                price: trxPrice,
                usdPrice: trxPrice,
                lastUpdated: 0,
              },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              tron: {
                [TRON_MAINNET]: true,
              },
            },
          },
        },
      },
      settings: { hideZeroBalanceTokens: true },
    } as unknown as DeepPartial<RootState>)
    .build();
