import { createStateFixture, deepMerge } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { safeToChecksumAddress } from '../../../app/util/address';
import {
  buildMultichainAccountsFixture,
  MULTICHAIN_TEST_ACCOUNTS,
  type MultichainAccountsFixture,
} from './multichainAccounts';

/** EIP-55 checksummed mUSD address, as required by useBalance's safeToChecksumAddress lookup. */
const RAMPS_MUSD_TOKEN_ADDRESS_CHECKSUM = safeToChecksumAddress(
  '0xaca92e438df0b2401ff60da7e4337b687a2435da',
) as string;

export const RAMPS_FRANCE_REGION = RampsRegions[RampsRegionsEnum.FRANCE];

export const RAMPS_SDK_LIMITS = {
  minAmount: 10,
  maxAmount: 10000,
} as const;

/**
 * Returns a pre-configured StateFixtureBuilder tailored for Aggregator (V1)
 * Ramp views. Provides the minimal Redux state required for BuildQuote to
 * render without extra mocks: mainnet NetworkController, a single account,
 * and a pre-selected US region.
 *
 * Pair with setupRampSdkApiMock() to intercept the SDK's HTTP calls.
 */
export const initialStateRamps = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalGasFee()
    .withMinimalKeyringController()
    .withOverrides({
      engine: {
        backgroundState: {
          GasFeeController: {
            // 'none' causes useGasPriceEstimation to return null immediately,
            // skipping live gas polling which requires Engine.context access.
            gasEstimateType: 'none',
            gasFeeEstimates: {},
            estimatedGasFeeTimeBounds: {},
          },
          AssetsController: {
            selectedCurrency: 'usd',
            assetsInfo: {
              'eip155:1/slip44:60': {
                type: 'native',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
              },
            },
            assetsPrice: {
              'eip155:1/slip44:60': {
                assetPriceType: 'fungible',
                id: 'eth',
                price: 2000,
                usdPrice: 2000,
                lastUpdated: 1700000000000,
              },
            },
          },
        },
      },
      fiatOrders: {
        selectedRegionAgg: {
          id: '/regions/us',
          name: 'United States',
          detected: false,
          currencies: ['/currencies/fiat/usd'],
          support: { buy: true, sell: true },
          states: [],
        },
      },
    } as unknown as DeepPartial<RootState>);

export interface RampsFranceSellFixture {
  state: DeepPartial<RootState>;
  multichainFixture: MultichainAccountsFixture;
}

/**
 * France sell flow: multichain accounts (incl. Account 3), FR region, and mUSD
 * balance on the default account for limit / balance assertions on BuildQuote.
 */
export function buildRampsFranceSellFixture(): RampsFranceSellFixture {
  const multichainFixture = buildMultichainAccountsFixture({
    includeSecondAccount: true,
    includeActivityAccount: true,
  });

  const accountAddress = MULTICHAIN_TEST_ACCOUNTS.account1.address;

  const franceOverrides = {
    fiatOrders: {
      selectedRegionAgg: RAMPS_FRANCE_REGION,
    },
    engine: {
      backgroundState: {
        GasFeeController: {
          gasEstimateType: 'none',
          gasFeeEstimates: {},
          estimatedGasFeeTimeBounds: {},
        },
        TokenBalancesController: {
          tokenBalances: {
            [accountAddress]: {
              '0x1': {
                [RAMPS_MUSD_TOKEN_ADDRESS_CHECKSUM]:
                  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
              },
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              [accountAddress]: {
                address: accountAddress,
                balance: '0x56bc75e2d63100000',
              },
            },
          },
        },
        AssetsController: {
          selectedCurrency: 'usd',
          assetsInfo: {
            'eip155:1/slip44:60': {
              type: 'native',
              symbol: 'ETH',
              name: 'Ethereum',
              decimals: 18,
            },
            [`eip155:1/erc20:${RAMPS_MUSD_TOKEN_ADDRESS_CHECKSUM.toLowerCase()}`]:
              {
                type: 'erc20',
                symbol: 'mUSD',
                name: 'MetaMask USD',
                decimals: 6,
              },
          },
          assetsPrice: {
            'eip155:1/slip44:60': {
              assetPriceType: 'fungible',
              id: 'eth',
              price: 2000,
              usdPrice: 2000,
              lastUpdated: 1700000000000,
            },
          },
          assetsBalance: {
            [MULTICHAIN_TEST_ACCOUNTS.account1.id]: {
              'eip155:1/slip44:60': { amount: '100' },
              [`eip155:1/erc20:${RAMPS_MUSD_TOKEN_ADDRESS_CHECKSUM.toLowerCase()}`]:
                // Large enough that 10001 mUSD is still under the wallet
                // balance when the SDK token uses 18 decimals.
                { amount: '10000000000000000000' },
            },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>;

  const state = deepMerge(
    multichainFixture.state as Record<string, unknown>,
    franceOverrides as Record<string, unknown>,
  ) as DeepPartial<RootState>;

  return { state, multichainFixture };
}
