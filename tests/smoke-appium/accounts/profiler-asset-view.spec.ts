import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { AppiumAssertions } from '../../framework/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokenOverview from '../../page-objects/wallet/TokenOverview.js';
import {
  startProfiler,
  stopProfiler,
} from '../../framework/fixtures/playwright/profiler.fixture.ts';
import { copyProfilerResult } from '../../framework/services/appium/Profiler.ts';

appiumTest.describe('ProfilerAssetView', () => {
  appiumTest(
    'captures a profile while opening the ETH asset view',
    async ({ driver, currentDeviceDetails }, testInfo) => {
      appiumTest.skip(
        process.env.APPIUM_RUN_PROFILER_TEST !== 'true',
        'Enable with APPIUM_RUN_PROFILER_TEST=true',
      );

      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright();
          await WalletView.tapOnTokensSection();

          let profilingStarted = false;
          await startProfiler(driver);
          profilingStarted = true;

          try {
            await WalletView.tapOnToken('ETH');
            await AppiumAssertions.expectElementToBeVisible(
              TokenOverview.priceChartContainer,
            );
            await AppiumAssertions.expectElementToBeVisible(
              TokenOverview.container,
            );
          } finally {
            if (profilingStarted) {
              await stopProfiler(driver);
              await copyProfilerResult({
                outputDirectory:
                  'tests/test-reports/appium-profiles/profiler-asset-view',
                testInfo,
                device: currentDeviceDetails,
              });
            }
          }
        },
      );
    },
  );
});
