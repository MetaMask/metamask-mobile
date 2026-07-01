import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { getDeviceLocale } from '../../framework/DeviceLocale.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Get Preferences Snap Tests'), () => {
  appiumTest(
    'gets the client preferences',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const locale = await getDeviceLocale(currentDeviceDetails);

      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: new FixtureBuilder()
            .withPreferencesController({
              privacyMode: true,
              showTestNetworks: true,
            })
            .build(),
        },
        async () => {
          await TestSnaps.installSnap('connectGetPreferencesButton');
          await TestSnaps.tapButton('getPreferencesButton');
          await TestSnaps.checkResultJson('preferencesResultSpan', {
            locale,
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
    },
  );
});
