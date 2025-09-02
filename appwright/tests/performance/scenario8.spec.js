import { test, afterAll } from 'appwright';

import TimerHelper from '../../utils/TimersHelper.js';
import { PerformanceTracker } from '../../reporters/PerformanceTracker.js';
import WelcomeScreen from '../../../wdio/screen-objects/Onboarding/OnboardingCarousel.js';
import TermOfUseScreen from '../../../wdio/screen-objects/Modals/TermOfUseScreen.js';
import OnboardingScreen from '../../../wdio/screen-objects/Onboarding/OnboardingScreen.js';
import CreateNewWalletScreen from '../../../wdio/screen-objects/Onboarding/CreateNewWalletScreen.js';
import MetaMetricsScreen from '../../../wdio/screen-objects/Onboarding/MetaMetricsScreen.js';
import OnboardingSucessScreen from '../../../wdio/screen-objects/OnboardingSucessScreen.js';
import OnboardingSheet from '../../../wdio/screen-objects/Onboarding/OnboardingSheet.js';
import WalletAccountModal from '../../../wdio/screen-objects/Modals/WalletAccountModal.js';
import SkipAccountSecurityModal from '../../../wdio/screen-objects/Modals/SkipAccountSecurityModal.js';
import ImportFromSeedScreen from '../../../wdio/screen-objects/Onboarding/ImportFromSeedScreen.js';
import CreatePasswordScreen from '../../../wdio/screen-objects/Onboarding/CreatePasswordScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AddAccountModal from '../../../wdio/screen-objects/Modals/AddAccountModal.js';
import TokenOverviewScreen from '../../../wdio/screen-objects/TokenOverviewScreen.js';
import CommonScreen from '../../../wdio/screen-objects/CommonScreen.js';
import WalletActionModal from '../../../wdio/screen-objects/Modals/WalletActionModal.js';
import { importSRPFlow, onboardingFlowImportSRP } from '../../utils/Flows.js';

const performanceTracker = new PerformanceTracker();
let info;

test('Asset View, SRP 1 + SRP 2 + SRP 3', async ({ device }, testInfo) => {
  info = testInfo;
  WelcomeScreen.device = device;
  TermOfUseScreen.device = device;
  OnboardingScreen.device = device;
  CreateNewWalletScreen.device = device;
  MetaMetricsScreen.device = device;
  OnboardingSucessScreen.device = device;
  OnboardingSheet.device = device;
  WalletAccountModal.device = device;
  SkipAccountSecurityModal.device = device;
  ImportFromSeedScreen.device = device;
  CreatePasswordScreen.device = device;
  WalletMainScreen.device = device;
  AccountListComponent.device = device;
  AddAccountModal.device = device;
  TokenOverviewScreen.device = device;
  CommonScreen.device = device;
  WalletActionModal.device = device;

  await onboardingFlowImportSRP(device, process.env.TEST_SRP_3);
  await importSRPFlow(device, process.env.TEST_SRP_2);
  // await importSRPFlow(device, process.env.TEST_SRP_3);

  await WalletMainScreen.isMainWalletViewVisible();

  const assetViewScreen = new TimerHelper(
    'Time since the user clicks on the asset view button until the user sees the token overview screen',
  );
  assetViewScreen.start();
  await WalletMainScreen.tapOnToken('Ethereum');
  await TokenOverviewScreen.isTokenOverviewVisible();
  await TokenOverviewScreen.isTodaysChangeVisible();
  assetViewScreen.stop();

  performanceTracker.addTimer(assetViewScreen);

  await performanceTracker.attachToTest(testInfo);
});

/*
test.afterAll(async ({}, testInfo) => {
  try {
    // Just attach metrics - video URL will be handled by custom reporter
    await performanceTracker.attachMetricsOnly(info);
    console.log('Metrics attached successfully in afterAll');

    // Store session ID for custom reporter to handle video URL fetching
    if (info && info.annotations) {
      const sessionId = info.annotations.find(
        (annotation) => annotation.type === 'sessionId'
      )?.description;

      if (sessionId) {
        console.log('Session ID stored for post-test video URL fetch:', sessionId);
        // Store session ID globally for custom reporter
        global.lastSessionId = sessionId;
        global.lastTestInfo = {
          title: info.title,
          outputDir: info.outputDir
        };
      }
    }
  } catch (error) {
    console.error('Error in afterAll:', error.message);
  }
});
*/
