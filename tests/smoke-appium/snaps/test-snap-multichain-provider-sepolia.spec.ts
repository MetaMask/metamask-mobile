import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import {
  runMultichainProviderTest,
  sepoliaChain,
} from './helpers/multichain-provider.helpers.js';

appiumTest.describe(
  SmokeSnaps('Multichain Provider Sepolia Snap Tests'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'can use the Multichain provider on Sepolia',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await runMultichainProviderTest(sepoliaChain, currentDeviceDetails);
      },
    );
  },
);
