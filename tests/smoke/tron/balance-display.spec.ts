import { SmokeNetworkExpansion } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import {
  mockTronApis,
  TRX_BALANCE,
  SUN_PER_TRX,
} from '../../api-mocking/mock-responses/tron-mocks';
import { createTronAccount, selectTronNetwork } from '../../flows/tron.flow';
import TronAccountView from '../../page-objects/Tron/TronAccountView';

jest.setTimeout(150_000);

describe(SmokeNetworkExpansion('Tron Balance Display'), () => {
  it('shows zero TRX balance for a new account with no funds', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer, true);
        },
      },
      async () => {
        await createTronAccount();
        await selectTronNetwork();
        await TronAccountView.checkBalanceIsDisplayed('0 TRX');
      },
    );
  });

  it('shows TRX balance with USD conversion for a funded account', async () => {
    const expectedTrx = (TRX_BALANCE / SUN_PER_TRX).toFixed(6);
    const expectedUsd = '$1.79';

    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await createTronAccount();
        await selectTronNetwork();
        await TronAccountView.checkBalanceIsDisplayed(expectedTrx);
        await TronAccountView.checkUsdBalanceIsDisplayed(expectedUsd);
      },
    );
  });
});
