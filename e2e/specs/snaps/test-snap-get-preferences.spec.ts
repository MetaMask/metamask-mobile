import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Get Preferences Snap Tests'), () => {
  it('gets the client preferences', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({
            privacyMode: true,
            showTestNetworks: true,
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectGetPreferencesButton');

        await TestSnaps.tapButton('getPreferencesButton');
        await TestSnaps.checkResultJson('preferencesResultSpan', {
          locale: 'en-US',
          currency: 'usd',
          hideBalances: true,
          useSecurityAlerts: true,
          simulateOnChainActions: true,
          useTokenDetection: true,
          batchCheckBalances: true,
          displayNftMedia: true,
          useNftDetection: true,
          useExternalPricingData: true,
          showTestnets: true,
        });
      },
    );
  });
});
