import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_SOLANA_FIXTURE_ACCOUNT,
  ENTROPY_WALLET_1_ID,
} from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import { DappVariants } from './framework/Constants';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from './api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';
import { SolScope } from '@metamask/keyring-api';
import { MOCK_ENTROPY_SOURCE } from '../app/util/test/keyringControllerTestUtils';

// Account IDs used in the fixture - must match between AccountTreeController and AccountsController
const ETH_ACCOUNT_ID = '4d7a5e0b-b261-4aed-8126-43972b0fa0a1';
const SOL_ACCOUNT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

/**
 * Creates a minimal AccountTreeController configuration for State2 multichain accounts.
 * This is required when enableMultichainAccountsState2 is enabled because the
 * MultichainAccountConnect component depends on account groups from AccountTreeController.
 */
function getMinimalAccountTreeForSolana() {
  const accountGroupId = `${ENTROPY_WALLET_1_ID}/account-1`;

  return {
    accountTree: {
      wallets: {
        [ENTROPY_WALLET_1_ID]: {
          id: ENTROPY_WALLET_1_ID,
          type: 'Entropy',
          metadata: {
            name: 'Secret Recovery Phrase 1',
            entropySource: MOCK_ENTROPY_SOURCE,
          },
          groups: {
            [accountGroupId]: {
              id: accountGroupId,
              type: 'MultipleAccount',
              accounts: [ETH_ACCOUNT_ID, SOL_ACCOUNT_ID],
              metadata: {
                name: 'Account 1',
              },
            },
          },
        },
      },
      selectedAccountGroup: accountGroupId,
    },
  };
}

/**
 * Creates AccountsController configuration with both EVM and Solana accounts.
 * This ensures the internal accounts match the AccountTreeController groups.
 */
function getAccountsControllerWithSolana() {
  return {
    internalAccounts: {
      accounts: {
        [ETH_ACCOUNT_ID]: {
          address: DEFAULT_FIXTURE_ACCOUNT,
          id: ETH_ACCOUNT_ID,
          metadata: {
            name: 'Account 1',
            importTime: 1684232000456,
            keyring: {
              type: 'HD Key Tree',
            },
          },
          options: {},
          methods: [
            'personal_sign',
            'eth_signTransaction',
            'eth_signTypedData_v1',
            'eth_signTypedData_v3',
            'eth_signTypedData_v4',
          ],
          type: 'eip155:eoa',
          scopes: ['eip155:0'],
        },
        [SOL_ACCOUNT_ID]: {
          address: DEFAULT_SOLANA_FIXTURE_ACCOUNT,
          id: SOL_ACCOUNT_ID,
          metadata: {
            name: 'Account 1',
            importTime: 1684232000456,
            keyring: {
              type: 'Snap Keyring',
            },
          },
          options: {},
          methods: ['signTransaction', 'signMessage', 'signAndSendTransaction'],
          type: 'solana:data-account',
          scopes: [SolScope.Mainnet, SolScope.Devnet, SolScope.Testnet],
        },
      },
      selectedAccount: ETH_ACCOUNT_ID,
    },
  };
}

export async function withSolanaAccountEnabled(
  {
    solanaAccountPermitted,
    evmAccountPermitted,
    dappVariant,
  }: {
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
  },
  test: () => Promise<void>,
) {
  let fixtureBuilder = new FixtureBuilder();

  if (solanaAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withSolanaAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }

  // Configure AccountTreeController with account groups for State2
  // This is required when enableMultichainAccountsState2 is enabled
  fixtureBuilder = fixtureBuilder.withAccountTreeController(
    getMinimalAccountTreeForSolana(),
  );

  // Merge AccountsController with Solana account
  const fixture = fixtureBuilder.build();
  const accountsControllerConfig = getAccountsControllerWithSolana();
  fixture.state.engine.backgroundState.AccountsController = {
    ...fixture.state.engine.backgroundState.AccountsController,
    ...accountsControllerConfig,
  };

  await withFixtures(
    {
      fixture,
      dapps: [
        {
          dappVariant: dappVariant || DappVariants.SOLANA_TEST_DAPP, // Default to the Solana test dapp if no variant is provided
        },
      ],
      restartDevice: true,
      testSpecificMock: async (mockServer) => {
        await setupRemoteFeatureFlagsMock(
          mockServer,
          remoteFeatureMultichainAccountsAccountDetailsV2(true),
        );
      },
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      await test();
    },
  );
}
