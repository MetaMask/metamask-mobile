import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../framework/fixtures/FixtureHelper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import TestHelpers from '../../helpers';
import TestSnaps from '../../pages/Browser/TestSnaps';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Get Preferences Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withPreferencesController({
        privacyMode: true,
        showTestNetworks: true,
      })
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150_000);
  });

  it('gets the client preferences', async () => {
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
  });
});
