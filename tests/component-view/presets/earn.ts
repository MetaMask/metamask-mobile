import { LendingProtocol } from '../../../app/components/UI/Earn/types/lending.types';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { initialStateWallet } from './wallet';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { LendingMarket } from '@metamask/stake-sdk';

export const EARN_TEST_ACCOUNT_ADDRESS =
  '0x0000000000000000000000000000000000000001';
export const EARN_TEST_USDC_ADDRESS =
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const EARN_TEST_USDC_CHECKSUM_ADDRESS =
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
export const EARN_TEST_MONEY_ACCOUNT_ADDRESS =
  '0x1000000000000000000000000000000000000001';
export const EARN_TEST_USDC_ASSET_ID =
  `eip155:1/erc20:${EARN_TEST_USDC_ADDRESS}` as const;

export const EARN_TEST_LENDING_MARKET = {
  id: 'mainnet-aave-usdc',
  chainId: 1,
  protocol: LendingProtocol.AAVE,
  name: 'Aave USDC',
  address: '0x1111111111111111111111111111111111111111',
  netSupplyRate: 4.2,
  totalSupplyRate: 4.2,
  rewards: [],
  tvlUnderlying: '1000000',
  underlying: {
    address: EARN_TEST_USDC_ADDRESS,
    chainId: 1,
  },
  outputToken: {
    address: '0xbcca60bb61934080951369a648fb03df4f96263c',
    chainId: 1,
  },
} satisfies LendingMarket;

interface InitialStateEarnOptions {
  deterministicFiat?: boolean;
  moneyAccountEnabled?: boolean;
}

/**
 * Returns a pre-configured StateFixtureBuilder tailored for EarnSection.
 *
 * The preset includes a held USDC lending asset, a matching lending market,
 * an eligible Money account, and deterministic controller state so catalogue
 * loading does not depend on external requests.
 */
export const initialStateEarn = (options: InitialStateEarnOptions = {}) => {
  const { deterministicFiat = true, moneyAccountEnabled = true } = options;
  const builder = initialStateWallet({ deterministicFiat });

  builder.withOverrides({
    engine: {
      backgroundState: {
        CurrencyRateController: {
          currencyRates: {
            ETH: {
              usdConversionRate: 2000,
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              [EARN_TEST_ACCOUNT_ADDRESS]: {
                address: EARN_TEST_ACCOUNT_ADDRESS,
                balance: '0x0',
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            '0x1': {
              [EARN_TEST_ACCOUNT_ADDRESS]: [
                {
                  address: EARN_TEST_USDC_CHECKSUM_ADDRESS,
                  symbol: 'USDC',
                  name: 'USD Coin',
                  decimals: 6,
                  image: 'usdc.png',
                  logo: 'usdc.png',
                  aggregators: [],
                },
              ],
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [EARN_TEST_ACCOUNT_ADDRESS]: {
              '0x1': {
                [EARN_TEST_USDC_CHECKSUM_ADDRESS]: '0x989680',
              },
            },
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              [EARN_TEST_USDC_CHECKSUM_ADDRESS]: {
                tokenAddress: EARN_TEST_USDC_CHECKSUM_ADDRESS,
                currency: 'ETH',
                price: 0.0005,
              },
            },
          },
        },
        EarnController: {
          lastUpdated: 0,
          pooled_staking: {
            isEligible: true,
          },
          lending: {
            positions: [],
            markets: [EARN_TEST_LENDING_MARKET],
          },
        },
        KeyringController: {
          keyrings: [
            {
              accounts: [EARN_TEST_ACCOUNT_ADDRESS],
              metadata: { id: 'wallet1', name: 'Wallet 1' },
              type: 'HD Key Tree',
            },
          ],
        },
        MoneyAccountController: {
          moneyAccounts: moneyAccountEnabled
            ? {
                'money-account-1': {
                  id: 'money-account-1',
                  address: EARN_TEST_MONEY_ACCOUNT_ADDRESS,
                  options: { entropy: { id: 'wallet1' } },
                },
              }
            : {},
        },
        GeolocationController: {
          location: 'US',
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            earnPooledStakingEnabled: {
              enabled: false,
              minimumVersion: '0.0.0',
            },
            earnStablecoinLendingEnabled: {
              enabled: true,
              minimumVersion: '0.0.0',
            },
            earnMoneyVaultApyControl: {
              vaultApyOverride: 0.062,
            },
            moneyAccountGeoBlockedCountries: {
              blockedRegions: [],
            },
            moneyEnableMoneyAccount: {
              enabled: moneyAccountEnabled,
              minimumVersion: '0.0.0',
            },
          },
        },
      },
    },
    settings: {
      hideZeroBalanceTokens: false,
    },
  } as unknown as DeepPartial<RootState>);

  return builder;
};
