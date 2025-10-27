import AppwrightSelectors from '../../../e2e/framework/AppwrightSelectors';
import MobileBrowserScreen from '../../../wdio/screen-objects/MobileBrowser.js';
import AppwrightGestures from '../../../e2e/framework/AppwrightGestures';

export async function launchMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  await device.activateApp(
    isAndroid ? 'com.android.chrome' : 'com.apple.mobilesafari',
  );
}

export async function navigateToDapp(device, url) {
  MobileBrowserScreen.device = device;

  await MobileBrowserScreen.tapSearchBox();
  await MobileBrowserScreen.tapUrlBar();
  await AppwrightGestures.typeText(
    await MobileBrowserScreen.chromeUrlBar,
    url + '\n',
  );
}
