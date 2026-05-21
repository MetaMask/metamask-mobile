import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';

describe(SmokeConfirmations('Transaction Pay'), () => {
  it('deposits to predict balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        console.log('loginToApp');
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log('after loginToApp');
      },
    );
  });
});
