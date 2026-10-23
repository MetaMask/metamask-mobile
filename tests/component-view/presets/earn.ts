import { createStateFixture } from '../stateFixture';

const EARN_ACCOUNT_ID = 'acc-1';
const NATIVE_ETH_ASSET_ID = 'eip155:1/slip44:60';

/**
 * 1.5 ETH. EarnInputView's 25% quick amount is 0.375 ETH from this balance.
 * `amount` is a decimal balance; AssetsController turns 18 decimals into wei.
 */
export const EARN_ETH_BALANCE = '1.5';

const enabledFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

const disabledFlag = {
  enabled: false,
  minimumVersion: '0.0.0',
};

interface InitialStateEarnOptions {
  stablecoinLendingEnabled?: boolean;
}

/**
 * Baseline for Earn deposit input. Flags are real RemoteFeatureFlagController
 * state so view tests do not mock selectors.
 */
export const initialStateEarn = ({
  stablecoinLendingEnabled = false,
}: InitialStateEarnOptions = {}) =>
  createStateFixture()
    .withMinimalAccounts()
    .withAccountTreeForSelectedAccount()
    .withMinimalMainnetNetwork()
    .withMinimalTokensController()
    .withMinimalEarnController()
    .withMinimalKeyringController()
    .withMinimalGasFee()
    .withRemoteFeatureFlags({
      earnPooledStakingEnabled: enabledFlag,
      earnPooledStakingServiceInterruptionBannerEnabled: disabledFlag,
      earnStablecoinLendingEnabled: stablecoinLendingEnabled
        ? enabledFlag
        : disabledFlag,
      earnStablecoinLendingServiceInterruptionBannerEnabled: disabledFlag,
    })
    .withOverrides({
      engine: {
        backgroundState: {
          AssetsController: {
            selectedCurrency: 'usd',
            assetsBalance: {
              [EARN_ACCOUNT_ID]: {
                [NATIVE_ETH_ASSET_ID]: {
                  amount: EARN_ETH_BALANCE,
                },
                'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df': {
                  amount: '0',
                },
              },
            },
            assetsInfo: {
              [NATIVE_ETH_ASSET_ID]: {
                type: 'native',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
              },
              // Gives the selected account a zero staked balance so Earn's
              // balance reader does not receive an undefined stakedBalance.
              'eip155:1/erc20:0x4FEF9D741011476750A243aC70b9789a63dd47Df': {
                type: 'erc20',
                symbol: 'ETH',
                name: 'Staked Ethereum',
                decimals: 18,
              },
            },
          },
          EarnController: {
            pooled_staking: {
              '1': {
                exchangeRate: '1',
                pooledStakes: {
                  account: '0x0000000000000000000000000000000000000001',
                  lifetimeRewards: '0',
                  assets: '0',
                  exitRequests: [],
                },
                vaultMetadata: {
                  apy: '2.3',
                  capacity: '1',
                  feePercent: 0,
                  totalAssets: '1',
                  vaultAddress: '0x0000000000000000000000000000000000000000',
                },
                vaultDailyApys: [],
                vaultApyAverages: {
                  oneDay: '2.3',
                  oneWeek: '2.3',
                  oneMonth: '2.3',
                  threeMonths: '2.3',
                  sixMonths: '2.3',
                  oneYear: '2.3',
                },
              },
            },
          },
        },
      },
    });
