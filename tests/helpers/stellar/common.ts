import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../framework/Constants';
import { loginToApp } from '../../flows/wallet.flow';

export const withStellarAccountSnap = async (
  testFn: () => Promise<void>,
): Promise<void> => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().withStellarEnabled().build(),
      restartDevice: true,
      dapps: [
        {
          dappVariant: DappVariants.STELLAR_TEST_DAPP,
        },
      ],
    },
    async () => {
      await loginToApp();
      await testFn();
    },
  );
};
