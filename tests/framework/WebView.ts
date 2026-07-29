import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import {
  fillAndroidWebId,
  readAndroidWebIdText,
  scrollAndroidWebIdIntoView,
  tapAndroidWebId,
  type AndroidWebViewScrollOptions,
  type AndroidWebViewTapOptions,
} from './AndroidWebViewNative.ts';
import { FrameworkDetector } from './FrameworkDetector.ts';
import Gestures from './Gestures.ts';
import Matchers from './Matchers.ts';
import { type PlaywrightElement } from './PlaywrightAdapter.ts';
import PlaywrightWebMatchers from './PlaywrightWebMatchers.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import { getDriver } from './PlaywrightUtilities.ts';

export type WebViewByIdOptions = AndroidWebViewScrollOptions & {
  /** Required for Appium Chromedriver / iOS WebView context lookups. */
  pageUrl?: string;
  /** Native WebView container testID. Defaults to the in-app browser WebView. */
  webviewId?: string;
  description?: string;
};

export type { AndroidWebViewScrollOptions, AndroidWebViewTapOptions };

/**
 * Multi-platform WebView interaction by HTML id.
 *
 * Android Appium uses native UiAutomator (`AndroidWebViewNative`) to avoid
 * Chromedriver context flakes. iOS Appium and Detox use the existing web-context
 * element path + Gestures.
 */
export default class WebView {
  /**
   * iOS Appium / Detox only. Android Appium never reaches this — public
   * methods route to native UiAutomator first.
   */
  private static async withContext(
    pageUrl: string | undefined,
    action: () => Promise<void>,
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      if (!pageUrl) {
        throw new Error(
          'pageUrl is required for Appium WebView context actions',
        );
      }
      await PlaywrightWebMatchers.withWebViewAction(pageUrl, action);
      return;
    }

    await action();
  }

  static async tapById(
    webId: string,
    options: WebViewByIdOptions = {},
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await tapAndroidWebId(webId, options);
      return;
    }

    await this.withContext(options.pageUrl, async () => {
      const webElement = await this.getElementById(webId, options);
      await Gestures.scrollToWebViewPort(webElement);
      await Gestures.tap(webElement, {
        elemDescription: options.description ?? `WebView tapById: ${webId}`,
      });
    });
  }

  static async fillById(
    webId: string,
    value: string,
    options: WebViewByIdOptions = {},
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await fillAndroidWebId(webId, value, options);
      return;
    }

    await this.withContext(options.pageUrl, async () => {
      const webElement = await this.getElementById(webId, options);
      await Gestures.typeInWebElement(webElement, value);
    });
  }

  static async readTextById(
    webId: string,
    options: WebViewByIdOptions = {},
  ): Promise<string> {
    if (PlatformDetector.isAndroidAppium()) {
      return readAndroidWebIdText(webId, options);
    }

    let text = '';
    await this.withContext(options.pageUrl, async () => {
      const webElement = await this.getElementById(webId, options);
      text = await webElement.getText();
    });
    return text;
  }

  /**
   * Select an option in an HTML `<select>` by visible option text.
   */
  static async selectOptionById(
    webId: string,
    optionText: string,
    options: WebViewByIdOptions = {},
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await tapAndroidWebId(webId, options);
      await Gestures.waitAndTap(Matchers.getElementByText(optionText), {
        elemDescription: `WebView select option "${optionText}"`,
      });
      return;
    }

    if (FrameworkDetector.isAppium()) {
      await this.withContext(options.pageUrl, async () => {
        await getDriver().execute(
          (id: string, searchText: string) => {
            const el = document.getElementById(id) as HTMLSelectElement | null;
            if (!el?.options) {
              throw new Error(`Select element #${id} not found`);
            }
            const option = Array.from(el.options).find((opt) =>
              opt.text.includes(searchText),
            );
            if (!option) {
              throw new Error(
                `Option containing "${searchText}" not found in #${id}`,
              );
            }
            el.value = option.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          webId,
          optionText,
        );
      });
      return;
    }

    // Detox web element — runScript is Detox-only.
    const webElement = await Matchers.getElementByWebID(
      options.webviewId ?? BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      webId,
    );

    const source = await webElement.runScript(
      (el: HTMLSelectElement, searchText: string) => {
        if (!el?.options) return null;
        const option = Array.from(el.options).find((opt) =>
          opt.text.includes(searchText),
        );
        return option ? option.value : null;
      },
      [optionText],
    );

    await webElement.runScript(
      (el: HTMLSelectElement, value: string | null) => {
        el.value = value ?? '';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [source],
    );
  }

  static async scrollIntoView(
    webId: string,
    options: WebViewByIdOptions = {},
  ): Promise<PlaywrightElement | WebElement> {
    if (PlatformDetector.isAndroidAppium()) {
      return scrollAndroidWebIdIntoView(webId, options);
    }

    let webElement: PlaywrightElement | WebElement | undefined;
    await this.withContext(options.pageUrl, async () => {
      const resolved = await this.getElementById(webId, options);
      await Gestures.scrollToWebViewPort(resolved);
      webElement = resolved;
    });
    if (!webElement) {
      throw new Error(`WebView.scrollIntoView failed for id "${webId}"`);
    }
    return webElement;
  }

  private static async getElementById(
    webId: string,
    options: WebViewByIdOptions,
  ): Promise<PlaywrightElement | WebElement> {
    const webviewId =
      options.webviewId ?? BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID;

    if (FrameworkDetector.isAppium()) {
      if (!options.pageUrl) {
        throw new Error(
          'pageUrl is required for Appium WebView element lookup',
        );
      }
      return Matchers.getElementByWebID(webviewId, webId, options.pageUrl);
    }

    return Matchers.getElementByWebID(webviewId, webId);
  }
}
