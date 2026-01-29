import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { AnvilPort } from '../../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../../tests/seeder/anvil-manager';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;
const ETH_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
const ETH_BALANCE_WEI = '0x' + (BigInt(10) * BigInt(10 ** 18)).toString(16);

export interface MusdFixtureOptions {
  musdConversionEducationSeen: boolean;
  hasUsdcBalance?: boolean;
  usdcBalance?: number;
  hasMusdBalance?: boolean;
  musdBalance?: number;
}

function getAccountAddress(
  fixture: ReturnType<FixtureBuilder['build']>,
): string | undefined {
  const ac = fixture.state.engine.backgroundState.AccountsController;
  const id = ac?.internalAccounts?.selectedAccount;
  return ac?.internalAccounts?.accounts?.[id]?.address;
}

function ensureTokenBalance(
  fixture: ReturnType<FixtureBuilder['build']>,
  accountAddress: string,
  tokenAddress: string,
  decimals: number,
  balance: number,
): void {
  const engine = fixture.state.engine.backgroundState;
  if (!engine.TokenBalancesController) {
    merge(engine, { TokenBalancesController: { tokenBalances: {} } });
  }
  const tb = engine.TokenBalancesController.tokenBalances ?? {};
  if (!tb[accountAddress]) tb[accountAddress] = {};
  if (!tb[accountAddress][CHAIN_IDS.MAINNET])
    tb[accountAddress][CHAIN_IDS.MAINNET] = {};
  const key = toChecksumHexAddress(tokenAddress);
  tb[accountAddress][CHAIN_IDS.MAINNET][key] =
    '0x' + Math.floor(balance * 10 ** decimals).toString(16);
}

function ensureNativeEthBalance(
  fixture: ReturnType<FixtureBuilder['build']>,
  accountAddress: string,
): void {
  const engine = fixture.state.engine.backgroundState;
  if (!engine.AccountTrackerController) {
    merge(engine, {
      AccountTrackerController: { accounts: {}, accountsByChainId: {} },
    });
  }
  const atc = engine.AccountTrackerController;
  atc.accounts = atc.accounts ?? {};
  atc.accountsByChainId = atc.accountsByChainId ?? {};
  atc.accounts[accountAddress] = { balance: ETH_BALANCE_WEI };
  atc.accountsByChainId[CHAIN_IDS.MAINNET] = {
    ...atc.accountsByChainId[CHAIN_IDS.MAINNET],
    [accountAddress]: { balance: ETH_BALANCE_WEI },
  };
}

/**
 * Builds a fixture for mUSD conversion E2E tests: Mainnet, ETH/USDC/mUSD tokens,
 * rates, balances, and mUSD eligibility state (geo, ramp).
 */
export function createMusdFixture(
  node: AnvilManager,
  options: MusdFixtureOptions,
): ReturnType<FixtureBuilder['build']> {
  const rpcPort = node?.getPort?.() ?? AnvilPort();
  const baseTokens = [
    {
      address: toChecksumHexAddress(ETH_NATIVE_ADDRESS),
      symbol: 'ETH',
      decimals: 18,
      name: 'Ethereum',
    },
    {
      address: toChecksumHexAddress(USDC_ADDRESS),
      symbol: 'USDC',
      decimals: USDC_DECIMALS,
      name: 'USDCoin',
    },
    ...(options.hasMusdBalance
      ? [
          {
            address: toChecksumHexAddress(MUSD_ADDRESS),
            symbol: 'MUSD',
            decimals: MUSD_DECIMALS,
            name: 'MUSD',
          },
        ]
      : []),
  ];

  const fixture = new FixtureBuilder()
    .withNetworkController({
      providerConfig: {
        chainId: CHAIN_IDS.MAINNET,
        rpcUrl: `http://localhost:${rpcPort}`,
        type: 'custom',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
      },
    })
    .withNetworkEnabledMap({ eip155: { [CHAIN_IDS.MAINNET]: true } })
    .withMetaMetricsOptIn()
    .withTokensForAllPopularNetworks(baseTokens)
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(ETH_NATIVE_ADDRESS),
      3000.0,
    )
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(USDC_ADDRESS), 1.0)
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(MUSD_ADDRESS), 1.0)
    .build();

  merge(fixture.state.user, {
    musdConversionEducationSeen: options.musdConversionEducationSeen,
  });

  if (!fixture.state.engine.backgroundState.CurrencyRateController) {
    merge(fixture.state.engine.backgroundState, {
      CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
    });
  }
  merge(fixture.state.engine.backgroundState.CurrencyRateController, {
    currentCurrency: 'usd',
    currencyRates: {
      ETH: {
        conversionDate: Date.now() / 1000,
        conversionRate: 3000.0,
        usdConversionRate: 3000.0,
      },
    },
  });

  fixture.state.fiatOrders.detectedGeolocation = 'US';
  fixture.state.fiatOrders.rampRoutingDecision = 'AGGREGATOR';

  const accountAddress = getAccountAddress(fixture);
  if (!accountAddress) return fixture;

  ensureNativeEthBalance(fixture, accountAddress);

  if (options.hasUsdcBalance !== false) {
    ensureTokenBalance(
      fixture,
      accountAddress,
      USDC_ADDRESS,
      USDC_DECIMALS,
      options.usdcBalance ?? 100,
    );
  }
  if (options.hasMusdBalance) {
    ensureTokenBalance(
      fixture,
      accountAddress,
      MUSD_ADDRESS,
      MUSD_DECIMALS,
      options.musdBalance ?? 10,
    );
  }

  return fixture;
}
