// Prefer release/main-e2e builds for Snap smoke — debug builds may open the RN dev menu during browser actions (see helpers/snap-smoke.helpers.ts).
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Get Preferences Snap Tests'), () => {
  appiumTest(
    'gets the client preferences',
    async ({ driver: _driver, currentDeviceDetails }) => {
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
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectGetPreferencesButton');
          await TestSnaps.tapButton('getPreferencesButton');
          // Locale varies locally; CI emulators are en-US.
          await TestSnaps.checkResultJsonExcluding(
            'preferencesResultSpan',
            process.env.CI ? [] : ['locale'],
            {
              ...(process.env.CI ? { locale: 'en-US' } : {}),
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
            },
          );
        },
      );
    },
  );
});
