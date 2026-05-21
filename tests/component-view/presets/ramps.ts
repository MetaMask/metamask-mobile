import { createStateFixture, deepMerge } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import {
  buildMultichainAccountsFixture,
  MULTICHAIN_TEST_ACCOUNTS,
  type MultichainAccountsFixture,
} from './multichainAccounts';

/** mUSD on Ethereum mainnet (matches ramp SDK API mock crypto list). */
export const RAMPS_MUSD_TOKEN_ADDRESS =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

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
  const mUsdChecksum = RAMPS_MUSD_TOKEN_ADDRESS;

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
                [mUsdChecksum]:
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
      },
    },
  } as unknown as DeepPartial<RootState>;

  const state = deepMerge(
    multichainFixture.state as Record<string, unknown>,
    franceOverrides as Record<string, unknown>,
  ) as DeepPartial<RootState>;

  return { state, multichainFixture };
}
