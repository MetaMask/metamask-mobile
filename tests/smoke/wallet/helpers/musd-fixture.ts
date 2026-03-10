import FixtureBuilder, {
  type MusdFixtureOptions,
} from '../../../framework/fixtures/FixtureBuilder';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../seeder/anvil-manager';
import { USDC_MAINNET, MUSD_MAINNET } from '../../../constants/musd-mainnet';

const USDC_DECIMALS = 6;
const MUSD_DECIMALS = 6;
const ETH_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Minimal EVM bytecode that returns 10 000 USDC (10 000 000 000 raw) for any
 * call, including `balanceOf(address)`. Deployed at the USDC contract address
 * on Anvil to satisfy the TransactionPayController balance validation.
 */
const ERC20_STUB_BYTECODE =
  '0x7f00000000000000000000000000000000000000000000000000000002540be40060005260206000f3';

export type { MusdFixtureOptions };

/**
 * Builds a fixture for mUSD conversion E2E tests using FixtureBuilder:
 * Mainnet, ETH/USDC/mUSD tokens, rates, balances, and mUSD eligibility state.
 */
export async function createMusdFixture(
  node: AnvilManager,
  options: MusdFixtureOptions,
): Promise<ReturnType<FixtureBuilder['build']>> {
  const rpcPort = node?.getPort?.() ?? AnvilPort();

  if (node) {
    await seedErc20Stub(node, USDC_MAINNET);
  }

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
      chainId: CHAIN_IDS.MAINNET,
      rpcUrl: `http://localhost:${rpcPort}`,
      type: 'custom',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
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

async function seedErc20Stub(
  node: AnvilManager,
  tokenAddress: string,
): Promise<void> {
  const { testClient } = node.getProvider();

  await testClient.setCode({
    address: tokenAddress as `0x${string}`,
    bytecode: ERC20_STUB_BYTECODE as `0x${string}`,
  });
}
