import FixtureBuilder, {
  type MusdFixtureOptions,
} from '../../../framework/fixtures/FixtureBuilder.ts';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils.ts';
import { AnvilManager } from '../../../seeder/anvil-manager.ts';
import { USDC_MAINNET, MUSD_MAINNET } from '../../../constants/musd-mainnet.ts';

const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;
const ETH_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

export type { MusdFixtureOptions };

/**
 * Builds a fixture for mUSD conversion E2E tests using FixtureBuilder:
 * Mainnet, ETH/USDC/mUSD tokens, rates, balances, and mUSD eligibility state.
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
      address: toChecksumHexAddress(USDC_MAINNET),
      symbol: 'USDC',
      decimals: USDC_DECIMALS,
      name: 'USDCoin',
    },
    ...(options.hasMusdBalance
      ? [
          {
            address: toChecksumHexAddress(MUSD_MAINNET),
            symbol: 'MUSD',
            decimals: MUSD_DECIMALS,
            name: 'MUSD',
          },
        ]
      : []),
  ];

  return new FixtureBuilder()
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
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(USDC_MAINNET), 1.0)
    .withTokenRates(CHAIN_IDS.MAINNET, toChecksumHexAddress(MUSD_MAINNET), 1.0)
    .withMusdConversion(options)
    .build();
}
