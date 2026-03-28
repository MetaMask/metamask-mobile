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
  sendTrx,
} from '../../flows/tron.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';

jest.setTimeout(150_000);

describe(SmokeConfirmations('Send TRX'), () => {
  it('sends TRX with a valid address and amount', async () => {
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

        await sendTrx(TRON_RECIPIENT_ADDRESS, '1');
        await TabBarComponent.tapActivity();
        await ActivitiesView.verifyActivityItemTitle('Send TRX');
      },
    );
  });
});
