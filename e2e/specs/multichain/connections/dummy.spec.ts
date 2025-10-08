import { SmokeNetworkExpansion } from '../../../tags';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../../viewHelper';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Dummy'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('tests fixture', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
    );
  });
});
