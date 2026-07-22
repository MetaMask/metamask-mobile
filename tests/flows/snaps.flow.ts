import TestSnaps from '../page-objects/Browser/TestSnaps';
import { navigateToBrowserView } from './browser.flow';
import { loginToAppPlaywright } from './wallet.flow';

/**
 * Logs in with the e2e wallet fixture and navigates to the test-snaps page.
 * Use after `withSnapsFixtures` in Appium snap smoke specs.
 */
export const loginAndOpenTestSnaps = async (): Promise<void> => {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await navigateToBrowserView();
  await TestSnaps.navigateToTestSnap({ skipTabCleanup: true });
};
