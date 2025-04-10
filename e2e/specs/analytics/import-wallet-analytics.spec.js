'use strict';
import { SmokeAnalytics } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import CommonView from '../../pages/CommonView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import TestHelpers from '../../helpers';
import AnalyticsHelper from './utils/AnalyticsHelper';
import { startMockServer } from '../../api-mocking/mock-server';

describe(SmokeAnalytics('Analytics during import wallet flow'), () => {
  const TEST_PRIVATE_KEY =
    'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

    let mockServer;

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();
    mockServer = await startMockServer();
    await TestHelpers.launchApp();
    await AnalyticsHelper.clearEvents();
  });

  afterAll(async () => {
    // Stop the mock server
    await mockServer.stop();
  });

  it('should track analytics events during wallet import', async () => {
    // // Import wallet
    // await TestHelpers.delay(10000);
    await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP);
    console.log(await AnalyticsHelper.getAllEvents());
    
    // // Verify wallet import analytics events
    // const walletImportEvents = await AnalyticsHelper.getEventsByType('wallet_import');
    // expect(walletImportEvents.length).toBeGreaterThan(0);
    // expect(walletImportEvents[0].properties).toHaveProperty('import_type', 'recovery_phrase');
  });

  // it('should track analytics events during account import', async () => {
  //   // Start monitoring analytics events
  //   await AnalyticsHelper.startMonitoring();

  //   // Import account
  //   await WalletView.tapIdenticon();
  //   await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  //   await AccountListBottomSheet.tapAddAccountButton();
  //   await AddAccountBottomSheet.tapImportAccount();
  //   await Assertions.checkIfVisible(ImportAccountView.container);
  //   await ImportAccountView.tapImportButton();
  //   await CommonView.tapOKAlertButton();
  //   await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
  //   await Assertions.checkIfVisible(SuccessImportAccountView.container);
  //   await SuccessImportAccountView.tapCloseButton();
  //   await AccountListBottomSheet.swipeToDismissAccountsModal();

  //   // Verify account import analytics events
  //   const accountImportEvents = await AnalyticsHelper.getEventsByType('account_import');
  //   expect(accountImportEvents.length).toBeGreaterThan(0);
  //   expect(accountImportEvents[0].properties).toHaveProperty('import_type', 'private_key');
  // });
});
