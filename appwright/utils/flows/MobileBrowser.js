import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import MobileBrowserScreen from '../../../wdio/screen-objects/MobileBrowser.js';

export async function launchMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  await device.activateApp(
    isAndroid ? 'com.android.chrome' : 'com.apple.mobilesafari',
  );
}

export async function navigateToDapp(device, url) {
  MobileBrowserScreen.device = device;

  await MobileBrowserScreen.chromeHomePageSearchBox.fill(url);
}
