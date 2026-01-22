import { Mockttp } from 'mockttp';
import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from './pages/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { DappVariants } from './framework/Constants';
import Assertions from './framework/Assertions';
import { createRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from './api-mocking/helpers/mockHelpers';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from './api-mocking/mock-responses/feature-flags-mocks';

// Priority higher than 999 to override the default setupRemoteFeatureFlagsMock
const FEATURE_FLAG_OVERRIDE_PRIORITY = 1000;

/**
 * Test-specific mock to disable the multichain accounts state 2 (BIP-44) feature flag.
 * This is necessary because tests using this helper rely on the legacy Solana account
 * creation flow (via Add Account UI), which is not available when BIP-44 is enabled.
 * With BIP-44 enabled, Solana accounts are automatically part of multichain account groups
 * and cannot be created separately through the UI.
 */
const testSpecificMock = async (mockServer: Mockttp): Promise<void> => {
  const { urlEndpoint, response, responseCode } = createRemoteFeatureFlagsMock({
    ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
  });

  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: urlEndpoint,
      response,
      responseCode,
    },
    FEATURE_FLAG_OVERRIDE_PRIORITY,
  );
};

export async function withSolanaAccountEnabled(
  {
    numberOfAccounts = 1,
    solanaAccountPermitted,
    evmAccountPermitted,
    dappVariant,
  }: {
    numberOfAccounts?: number;
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
  },
  test: () => Promise<void>,
) {
  let fixtureBuilder = new FixtureBuilder().withSolanaFixture();

  if (solanaAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withSolanaAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }
  const fixtures = fixtureBuilder.build();

  await withFixtures(
    {
      fixture: fixtures,
      dapps: [
        {
          dappVariant: dappVariant || DappVariants.SOLANA_TEST_DAPP, // Default to the Solana test dapp if no variant is provided
        },
      ],
      restartDevice: true,
      testSpecificMock,
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Create Solana accounts through the wallet view
      for (let i = 0; i < numberOfAccounts; i++) {
        await WalletView.tapCurrentMainWalletAccountActions();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          `Solana Account ${i + 1}`,
        );
      }

      await test();
    },
  );
}
