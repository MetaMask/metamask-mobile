import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import MobileBrowserScreen from '../../../wdio/screen-objects/MobileBrowser.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';

export async function launchMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  await device.activateApp(
    isAndroid ? 'com.android.chrome' : 'com.apple.mobilesafari',
  );
}

export async function navigateToDapp(device, url, dappName) {
  MobileBrowserScreen.device = device;

  // Chrome might or not be onboarded depending on the device state
  try {
    await MobileBrowserScreen.tapOnboardingChromeWithoutAccount();
    await MobileBrowserScreen.tapChromeNoThanksButton();
  } catch (error) {
    console.log('Chrome is already onboarded. Skipping onboarding.');
  }

  await MobileBrowserScreen.tapSearchBox();
  await MobileBrowserScreen.tapUrlBar();
  await AppwrightGestures.typeText(
    await MobileBrowserScreen.chromeUrlBar,
    url + '\n',
  );
  await MobileBrowserScreen.tapSelectDappUrl(dappName);
}
