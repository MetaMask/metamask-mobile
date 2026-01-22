import { test } from '../../../fixtures/performance-test.js';

import LoginScreen from '../../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../../wdio/screen-objects/WalletMainScreen.js';

import AccountListComponent from '../../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../../wdio/screen-objects/Modals/AddAccountModal.js';
import WalletActionModal from '../../../../wdio/screen-objects/Modals/WalletActionModal.js';
import SwapScreen from '../../../../wdio/screen-objects/SwapScreen.js';
import TabBarModal from '../../../../wdio/screen-objects/Modals/TabBarModal.js';
import {
  dismissMultichainAccountsIntroModal,
  dissmissPredictionsModal,
  importSRPFlow,
  login,
} from '../../../utils/Flows.js';
import { PerformanceLogin, PerformanceAccountList } from '../../../tags.js';

/* Scenario 4: Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3 */
test.describe(`${PerformanceLogin} ${PerformanceAccountList}`, () => {
  test('Import SRP with +50 accounts, SRP 1, SRP 2, SRP 3', async ({
    device,
    performanceTracker,
  }) => {
    LoginScreen.device = device;
    WalletMainScreen.device = device;
    AccountListComponent.device = device;
    AddAccountModal.device = device;
    WalletActionModal.device = device;
    SwapScreen.device = device;
    TabBarModal.device = device;
    test.setTimeout(1800000);
    await login(device);

    const timers = await importSRPFlow(device, process.env.TEST_SRP_2, false);
    timers.forEach((timer) => performanceTracker.addTimer(timer));
    // Quality gates validation is performed by the reporter when generating reports
  });
}); // End describe
