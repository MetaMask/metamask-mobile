import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import {
  runMultichainProviderTest,
  solanaChain,
} from './helpers/multichain-provider.helpers.js';

appiumTest.describe(SmokeSnaps('Multichain Provider Solana Snap Tests'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest(
    'can use the Multichain provider on Solana',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await runMultichainProviderTest(solanaChain, currentDeviceDetails);
    },
  );
});
