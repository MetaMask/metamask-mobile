import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import {
  ethereumChain,
  runMultichainProviderTest,
} from './helpers/multichain-provider.helpers.js';

appiumTest.describe(
  SmokeSnaps('Multichain Provider Ethereum Snap Tests'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'can use the Multichain provider on Ethereum',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await runMultichainProviderTest(ethereumChain, currentDeviceDetails);
      },
    );
  },
);
