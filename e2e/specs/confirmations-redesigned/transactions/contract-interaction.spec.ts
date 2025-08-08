import { SMART_CONTRACTS } from '../../../../app/util/test/smart-contracts';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../api-mocking/mock-responses/simulations';
import TestDApp from '../../../pages/Browser/TestDApp';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeConfirmationsRedesigned('Contract Interaction'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  const testSpecificMock = {
    POST: [],
    GET: [
      SIMULATION_ENABLED_NETWORKS_MOCK,
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations,
    ],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('submits transaction', async () => {
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
        testSpecificMock,
        smartContracts: [NFT_CONTRACT],
      },
      async ({ contractRegistry }) => {
        const nftsAddress = await contractRegistry?.getContractAddress(
          NFT_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });

        await TestDApp.tapERC721MintButton();

        // Check all expected elements are visible
        await Assertions.expectElementToBeVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        await Assertions.expectElementToBeVisible(RowComponents.AccountNetwork);
        await Assertions.expectElementToBeVisible(
          RowComponents.SimulationDetails,
        );
        await Assertions.expectElementToBeVisible(RowComponents.OriginInfo);
        await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails);
        await Assertions.expectElementToBeVisible(
          RowComponents.AdvancedDetails,
        );

        // Accept confirmation
        await FooterActions.tapConfirmButton();

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.expectTextDisplayed('Confirmed');
      },
    );
  });
});
