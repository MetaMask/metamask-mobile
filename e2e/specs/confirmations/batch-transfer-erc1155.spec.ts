import { SmokeConfirmations } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Assertions from '../../framework/Assertions';
import { ContractApprovalBottomSheetSelectorsText } from '../../selectors/Browser/ContractApprovalBottomSheet.selectors';
import ContractApprovalBottomSheet from '../../pages/Browser/ContractApprovalBottomSheet';
import { DappVariants } from '../../framework/Constants';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeConfirmations('ERC1155 token'), () => {
  const ERC1155_CONTRACT = SMART_CONTRACTS.ERC1155;

  it('batch transfer ERC1155 tokens', async () => {
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
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        smartContracts: [ERC1155_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const erc1155Address = await contractRegistry?.getContractAddress(
          ERC1155_CONTRACT,
        );
        await loginToApp();

        // Navigate to the browser screen
        await TabBarComponent.tapBrowser();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: erc1155Address,
        });

        // Send batch transfer for ERC1155 tokens
        await TestDApp.tapERC1155BatchTransferButton();
        await Assertions.expectTextDisplayed(
          ContractApprovalBottomSheetSelectorsText.CONFIRM,
        );

        // Tap confirm button
        await ContractApprovalBottomSheet.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        // Assert that the ERC1155 activity is an smart contract interaction and it is confirmed
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION,
        );
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );
      },
    );
  });
});
