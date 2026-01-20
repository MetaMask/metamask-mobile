import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors.js';
import MobileBrowserScreen from '../../wdio/screen-objects/MobileBrowser.js';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures.js';

export async function launchMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  await device.activateApp(
    isAndroid ? 'com.android.chrome' : 'com.apple.mobilesafari',
  );
}

export async function navigateToDappAndroid(device, url, dappName) {
  MobileBrowserScreen.device = device;

  await MobileBrowserScreen.tapSearchBox();
  await MobileBrowserScreen.tapUrlBar();
  await AppwrightGestures.typeText(await MobileBrowserScreen.chromeUrlBar, url);
  await MobileBrowserScreen.tapSelectDappUrl();
}

export async function navigateToDappIOS(device, url, dappName) {
  throw new Error('Not implemented');
}

export async function navigateToDapp(device, url, dappName) {
  if (AppwrightSelectors.isAndroid(device)) {
    return navigateToDappAndroid(device, url, dappName);
  }
  if (AppwrightSelectors.isIOS(device)) {
    return navigateToDappIOS(device, url, dappName);
  }
  throw new Error('Unsupported platform');
}

export async function refreshMobileBrowser(device) {
  if (AppwrightSelectors.isIOS(device)) {
    throw new Error('Not implemented');
  }
  if (AppwrightSelectors.isAndroid(device)) {
    await MobileBrowserScreen.tapChromeMenuButton();
    return MobileBrowserScreen.tapChromeRefreshButton();
  }
  throw new Error('Unsupported platform');
}
