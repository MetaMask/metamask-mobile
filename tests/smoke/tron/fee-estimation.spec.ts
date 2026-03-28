import { SmokeConfirmations } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { loginToApp } from '../../flows/wallet.flow';
import {
  mockTronApis,
  TRON_RECIPIENT_ADDRESS,
} from '../../api-mocking/mock-responses/tron-mocks';
import {
  selectTronNetwork,
} from '../../flows/tron.flow';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import MultichainTransactionDetailsSheet from '../../page-objects/Transactions/MultichainTransactionDetailsSheet';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import TronSendView from '../../page-objects/Tron/TronSendView';
import WalletView from '../../page-objects/wallet/WalletView';

jest.setTimeout(150_000);

describe(SmokeConfirmations('Tron Fee Estimation'), () => {
  it('shows network fee on TRX send confirmation screen', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronAccount().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await selectTronNetwork();

        await WalletView.tapOnToken('TRX');
        await TronAccountView.tapSendButton();

        await TronSendView.checkAmountScreenVisible();
        await TronSendView.fillAmount('1');
        await TronSendView.tapContinue();
        await TronSendView.fillRecipient(TRON_RECIPIENT_ADDRESS);
        await TronSendView.tapReview();
        await ActivitiesView.verifyActivityItemTitle('Send TRX');
        await ActivitiesView.tapOnTransactionItem(0);
        await MultichainTransactionDetailsSheet.verifySheetVisible();
      },
    );
  });

  it('shows network fee on TRC-20 token send confirmation screen', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronAccount().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await selectTronNetwork();

        await WalletView.tapOnToken('USDT');
        await TronAccountView.tapSendButton();

        await TronSendView.checkAmountScreenVisible();
        await TronSendView.fillAmount('1');
        await TronSendView.tapContinue();
        await TronSendView.fillRecipient(TRON_RECIPIENT_ADDRESS);
        await TronSendView.tapReview();
        await ActivitiesView.verifyActivityItemTitle('Send USDT');
        await ActivitiesView.tapOnTransactionItem(0);
        await MultichainTransactionDetailsSheet.verifySheetVisible();
      },
    );
  });
});
