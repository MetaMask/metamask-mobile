import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../page-objects/Browser/TestSnaps';
import { Assertions } from '../../framework';
import { Mockttp } from 'mockttp';
import { mockCronjobSnap } from '../../api-mocking/mock-response-data/snaps/snap-binary-mocks';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Cronjob Snap Tests'), () => {
  it('can connect to the Cronjob Snap which triggers a dialog', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockCronjobSnap(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectCronjobSnapButton');

        await Assertions.expectTextDisplayed(
          'This dialog was triggered by a cronjob.',
          { timeout: 30_000 },
        );
      },
    );
  });
});
