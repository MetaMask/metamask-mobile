'use strict';
import { Regression } from '../../../tags';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { CustomNetworks } from '../../../resources/networks.e2e';
import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../selectors/Transactions/ActivitiesView.selectors';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../../fixtures/utils';

const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig;

describe(SmokeNetworkEnablement(`${MEGAETH_TESTNET.nickname} - Send ERC721 tokens`), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it(`send an ERC721 token from a dapp using ${MEGAETH_TESTNET.nickname}`, async () => {
    const testSpecificMock = {
      GET: [mockEvents.GET.suggestedGasFeesApiGanache],
    };

    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withMegaTestnetNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions([`${MEGAETH_TESTNET.chainId}`]),
          )
          .build(),
        restartDevice: true,
        smartContract: NFT_CONTRACT,
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });
        
        // Transfer NFT
        await TestDApp.tapNFTTransferButton();
        await TestHelpers.delay(3000);

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert collectible is sent
        await Assertions.checkIfTextIsDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });
});
