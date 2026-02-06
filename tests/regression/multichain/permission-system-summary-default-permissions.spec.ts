import { RegressionNetworkAbstractions } from '../../../e2e/tags';
import Browser from '../../../e2e/pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../../e2e/pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import Assertions from '../../framework/Assertions';
import PermissionSummaryBottomSheet from '../../../e2e/pages/Browser/PermissionSummaryBottomSheet';
import { DappVariants } from '../../framework/Constants';
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
