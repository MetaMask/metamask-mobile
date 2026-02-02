import { RegressionNetworkAbstractions } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';
import { DappVariants } from '../../../tests/framework/Constants';
import { PermissionSummaryBottomSheetSelectorsText } from '../../../app/components/Views/AccountConnect/PermissionSummaryBottomSheet.testIds';

describe(
  RegressionNetworkAbstractions('Permission System - Default Permissions'),
  () => {
    it('should display default account and chain permissions in permission summary', async () => {
      // Test setup with fixtures
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission() // Initialize with Ethereum mainnet only
            .build(),
          restartDevice: true,
        },
        async () => {
          // Step 1: Initial app setup
          await loginToApp();
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          // Step 2: Navigate to permissions management
          await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
          await ConnectedAccountsModal.tapManagePermissionsButton();
          await ConnectedAccountsModal.tapPermissionsSummaryTab();

          // Step 3: Verify account permissions
          const accountLabelElement =
            (await PermissionSummaryBottomSheet.accountPermissionLabelContainer) as IndexableNativeElement;
          const accountLabelAttributes =
            await accountLabelElement.getAttributes();
          const accountLabel = (accountLabelAttributes as { label: string })
            .label;

          await Assertions.checkIfTextMatches(
            accountLabel,
            PermissionSummaryBottomSheetSelectorsText.ACCOUNT_ONE_LABEL,
          );

          // Step 4: Verify chain permissions
          await Assertions.expectElementToBeVisible(
            PermissionSummaryBottomSheet.ethereumMainnetText,
          );
        },
      );
    });
  },
);
