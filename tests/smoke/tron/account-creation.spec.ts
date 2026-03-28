import { Mockttp } from 'mockttp';
import { SmokeNetworkExpansion } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { mockTronApis } from '../../api-mocking/mock-responses/tron-mocks';
import { createTronAccount, selectTronNetwork } from '../../flows/tron.flow';
import { loginToApp } from '../../flows/wallet.flow';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import WalletView from '../../page-objects/wallet/WalletView';

jest.setTimeout(150_000);

describe(SmokeNetworkExpansion('Tron Account Creation'), () => {
  it('creates a Tron account and selects the Tron network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await createTronAccount();
        await selectTronNetwork();
        await TronAccountView.checkSelectedNetworkIsVisible();
      },
    );
  });
});
