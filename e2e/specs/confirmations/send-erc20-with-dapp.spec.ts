import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  SMART_CONTRACTS,
  contractConfiguration,
} from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../framework/Assertions';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  it('send an ERC20 token from a dapp', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
      );
    };

    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        smartContracts: [HST_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          HST_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: hstAddress,
        });

        // Transfer ERC20 tokens
        await TestDApp.tapERC20TransferButton();

        // Tap confirm button
        await TestDApp.tapConfirmButtonToDisappear();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert "Sent Tokens" transaction is displayed
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SENT_TOKENS_MESSAGE_TEXT(
            // contractConfiguration is not typed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contractConfiguration[HST_CONTRACT] as any).tokenName as string,
          ),
        );
      },
    );
  });
});
