import { SmokeWalletPlatform } from '../../../../e2e/tags';
import Assertions from '../../../framework/Assertions';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_2,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import TestDApp from '../../../../e2e/pages/Browser/TestDApp';
import Browser from '../../../../e2e/pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../../../e2e/pages/Browser/ConnectedAccountsModal';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { DappVariants } from '../../../framework/Constants';
import ToastModal from '../../../../e2e/pages/wallet/ToastModal';
import AccountListBottomSheet from '../../../../e2e/pages/wallet/AccountListBottomSheet';
import NetworkListModal from '../../../../e2e/pages/Network/NetworkListModal';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeWalletPlatform('EVM Provider Events'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should notify the connected account and chain on load of a permitted dapp', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        const connectedAccounts = await TestDApp.getConnectedAccounts();
        if (connectedAccounts !== DEFAULT_FIXTURE_ACCOUNT_CHECKSUM) {
          throw new Error('connected accounts did not match');
        }

        const connectedChainId = await TestDApp.getConnectedChainId();
        if (connectedChainId !== '0x1') {
          throw new Error('connected chain ID did not match');
        }
      },
    );
  });

  it('notifies a dapp when the wallet switches to an account it has permission to access. ', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .withPermissionControllerConnectedToTestDapp({
            [Caip25EndowmentPermissionName]: {
              caveats: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {
                      'eip155:1': {
                        accounts: [
                          `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
                          `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_2.toLowerCase()}`,
                        ],
                      },
                    },
                    requiredScopes: {},
                    sessionProperties: {},
                    isMultichainOrigin: false,
                  },
                },
              ],
            },
          })
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(false),
          );
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        const connectedAccountsBefore = await TestDApp.getConnectedAccounts();
        if (
          connectedAccountsBefore !==
          [DEFAULT_FIXTURE_ACCOUNT_CHECKSUM, DEFAULT_FIXTURE_ACCOUNT_2].join(
            ',',
          )
        ) {
          throw new Error(
            'connected accounts did not match expected starting state',
          );
        }

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );

        await AccountListBottomSheet.tapAccountByName('Account 2');

        const connectedAccountsAfter = await TestDApp.getConnectedAccounts();
        if (
          connectedAccountsAfter !==
          [DEFAULT_FIXTURE_ACCOUNT_2, DEFAULT_FIXTURE_ACCOUNT_CHECKSUM].join(
            ',',
          )
        ) {
          throw new Error(
            'connected accounts did not match expected end state',
          );
        }
      },
    );
  });

  it('notifies a permitted dapp of the new chain ID when the network changes', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp({
            [Caip25EndowmentPermissionName]: {
              caveats: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {
                      'eip155:1': {
                        accounts: [
                          `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
                        ],
                      },
                      'eip155:1337': {
                        accounts: [
                          `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
                        ],
                      },
                    },
                    requiredScopes: {},
                    sessionProperties: {},
                    isMultichainOrigin: false,
                  },
                },
              ],
            },
          })
          .build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(false),
          );
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        const connectedChainIdBefore = await TestDApp.getConnectedChainId();
        if (connectedChainIdBefore !== '0x1') {
          throw new Error(
            'selected chainId did not match expected starting state',
          );
        }

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );

        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapNetworksPicker();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.changeNetworkTo('Localhost');

        const connectedChainIdAfter = await TestDApp.getConnectedChainId();
        if (connectedChainIdAfter !== '0x539') {
          throw new Error('selected chainId did not match expected end state');
        }
      },
    );
  });
});
