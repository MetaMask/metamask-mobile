import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../../seeder/anvil-manager';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { keccak256, encodePacked, pad, toHex, type Hex } from 'viem';

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

/**
 * USDC balanceOf mapping is at storage slot 9 (FiatTokenV2_1).
 * slot = keccak256(abi.encode(address, 9))
 */
const USDC_BALANCE_SLOT = 9n;

async function seedUsdcBalance(
  node: AnvilManager,
  account: Hex,
  amount: bigint,
): Promise<void> {
  const { testClient } = node.getProvider();
  const slot = keccak256(
    encodePacked(
      ['bytes32', 'bytes32'],
      [pad(account, { size: 32 }), pad(toHex(USDC_BALANCE_SLOT), { size: 32 })],
    ),
  );
  await testClient.setStorageAt({
    address: USDC_MAINNET as Hex,
    index: slot,
    value: pad(toHex(amount), { size: 32 }),
  });
}

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const AAVE_SUPPLY_ABI = [
  {
    name: 'supply',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;

const AAVE_POOL = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

async function seedAethUsdcViaDeposit(
  node: AnvilManager,
  account: Hex,
  amount: bigint,
): Promise<void> {
  const { testClient, walletClient, publicClient } = node.getProvider();

  await testClient.impersonateAccount({ address: account });

  const approveTx = await walletClient.writeContract({
    account,
    address: USDC_MAINNET as Hex,
    abi: ERC20_APPROVE_ABI,
    functionName: 'approve',
    args: [AAVE_POOL as Hex, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  const supplyTx = await walletClient.writeContract({
    account,
    address: AAVE_POOL as Hex,
    abi: AAVE_SUPPLY_ABI,
    functionName: 'supply',
    args: [USDC_MAINNET as Hex, amount, account, 0],
  });
  await publicClient.waitForTransactionReceipt({ hash: supplyTx });

  await testClient.stopImpersonatingAccount({ address: account });
}

export async function createLendingFixture(
  node: AnvilManager,
  options: LendingFixtureOptions = {},
): Promise<ReturnType<FixtureBuilder['build']>> {
  const { hasExistingPosition = false, usdcBalance = 10000 } = options;

  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  const usdcMinimalUnits = BigInt(usdcBalance) * 10n ** 6n;
  await seedUsdcBalance(node, DEFAULT_FIXTURE_ACCOUNT as Hex, usdcMinimalUnits);

  if (hasExistingPosition) {
    const depositAmount = usdcMinimalUnits / 2n;
    await seedAethUsdcViaDeposit(
      node,
      DEFAULT_FIXTURE_ACCOUNT as Hex,
      depositAmount,
    );
  }

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
    .withTokens(
      [
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
      ],
      CHAIN_IDS.MAINNET,
    )
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
