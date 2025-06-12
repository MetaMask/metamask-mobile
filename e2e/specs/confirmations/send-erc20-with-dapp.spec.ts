'use strict';
import { SmokeConfirmations } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import {
  SMART_CONTRACTS,
  contractConfiguration,
} from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import Assertions from '../../utils/Assertions';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../fixtures/utils';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { CustomNetworks } from '../../resources/networks.e2e';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;
const HST_CONTRACT = SMART_CONTRACTS.HST;

describe(SmokeConfirmations('ERC20 tokens'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('send an ERC20 token from a dapp', async () => {
    const testSpecificMock  = {
      GET: [
        mockEvents.GET.suggestedGasFeesApiGanache,
        mockEvents.GET.remoteFeatureFlagsOldConfirmations
      ],
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: HST_CONTRACT,
        testSpecificMock,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const hstAddress = await contractRegistry.getContractAddress(
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

        // Tap confirm button
        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert "Sent Tokens" transaction is displayed
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_TOKENS_MESSAGE_TEXT(
            // contractConfiguration is not typed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (contractConfiguration[HST_CONTRACT] as any).tokenName as string,
          ),
        );
      },
    );
  });

it(`send an ERC20 token from a dapp using ${MONAD_TESTNET.nickname}`, async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withMonadTestnetNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions([`${MONAD_TESTNET.chainId}`]),
          )
          .build(),
        restartDevice: true,
        smartContract: HST_CONTRACT,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const hstAddress = await contractRegistry.getContractAddress(
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
        await FooterActions.tapConfirmButton();
        await TestHelpers.delay(3000);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });

  it(`send an ERC20 token from a dapp using ${MEGAETH_TESTNET.nickname}`, async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withMonadTestnetNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions([`${MEGAETH_TESTNET.chainId}`]),
          )
          .build(),
        restartDevice: true,
        smartContract: HST_CONTRACT,
      },
      // Remove any once withFixtures is typed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async ({ contractRegistry }: { contractRegistry: any }) => {
        const hstAddress = await contractRegistry.getContractAddress(
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
        await FooterActions.tapConfirmButton();
        await TestHelpers.delay(3000);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });
});
