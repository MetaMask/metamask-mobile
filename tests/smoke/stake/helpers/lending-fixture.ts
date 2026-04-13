import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../seeder/anvil-manager';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { merge } from 'lodash';

/** Lowercase USDC mainnet address — must stay lowercase so the earn selector lookup matches. */
const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_NATIVE = '0x0000000000000000000000000000000000000000';
const AAVE_USDC_OUTPUT_TOKEN = '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c';

export interface LendingFixtureOptions {
  /** When true, seed an existing lending position for withdrawal tests. */
  hasExistingPosition?: boolean;
  /** USDC balance to seed in the fixture (default: 10 000). */
  usdcBalance?: number;
}

export function createLendingFixture(
  node: AnvilManager,
  options: LendingFixtureOptions = {},
): ReturnType<FixtureBuilder['build']> {
  const { hasExistingPosition = false, usdcBalance = 10000 } = options;

  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  const fixture = new FixtureBuilder()
    .withNetworkController({
      chainId: CHAIN_IDS.MAINNET,
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
    })
    .withNetworkEnabledMap({ eip155: { [CHAIN_IDS.MAINNET]: true } })
    .withMetaMetricsOptIn()
    .withTokensForAllPopularNetworks([
      {
        address: toChecksumHexAddress(ETH_NATIVE),
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
      },
      {
        address: toChecksumHexAddress(USDC_MAINNET),
        symbol: 'USDC',
        decimals: 6,
        name: 'USDCoin',
      },
      ...(hasExistingPosition
        ? [
            {
              address: toChecksumHexAddress(AAVE_USDC_OUTPUT_TOKEN),
              symbol: 'aEthUSDC',
              decimals: 6,
              name: 'Aave Ethereum USDC',
            },
          ]
        : []),
    ])
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(ETH_NATIVE), 3000.0)
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(USDC_MAINNET),
      0.000333,
    )
    .withTokenRates(
      CHAIN_IDS.MAINNET,
      toChecksumHexAddress(AAVE_USDC_OUTPUT_TOKEN),
      0.000333,
    )
    .withMusdConversion({
      hasUsdcBalance: true,
      usdcBalance,
      musdConversionEducationSeen: true,
    })
    .build();

  // Seed feature flags directly so they're available on first render
  // (API mock has a race condition with the initial paint)
  merge(fixture.state.engine.backgroundState, {
    RemoteFeatureFlagController: {
      remoteFeatureFlags: {
        earnStablecoinLendingEnabled: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
        earnPooledStakingEnabled: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
      },
    },
  });

  return fixture;
}
