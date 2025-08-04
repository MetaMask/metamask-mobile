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
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../fixtures/utils';
import { NETWORK_TEST_CONFIGS } from '../../resources/mock-configs';
import { DappVariants } from '../../framework/Constants';
import TestHelpers from '../../helpers';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  it('send an ERC20 token from a dapp', async () => {
    const testSpecificMockWithFlags = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache,
        mockEvents.GET.remoteFeatureFlagsOldConfirmations,
      ],
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
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        smartContracts: [HST_CONTRACT],
        testSpecificMock: testSpecificMockWithFlags,
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
        await TestDApp.tapConfirmButton();

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

  // Table-driven tests for all networks
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`send an ERC20 token from a dapp using ${networkConfig.name} (local)`, async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withNetworkController({
              providerConfig: networkConfig.providerConfig,
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(networkConfig.permissions),
            )
            .build(),
          restartDevice: true,
          smartContracts: [HST_CONTRACT],
          testSpecificMock: networkConfig.testSpecificMock,
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
          await TestHelpers.delay(3000);

          // Transfer ERC20 tokens
          await TestDApp.tapERC20TransferButton();
          await TestHelpers.delay(3000);

          // Accept confirmation
          await TestDApp.tapConfirmButton();
          await TestHelpers.delay(3000);

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  }
});
