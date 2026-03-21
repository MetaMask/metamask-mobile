import { dataTestIds } from '@metamask/test-dapp-solana';
import { getTestDappLocalUrl } from '../../framework/fixtures/FixtureUtils';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Browser from './BrowserView';
import Gestures from '../../framework/Gestures';
import { waitFor } from 'detox';
import {
  BOTTOM_SHEET_FOOTER_SUBSEQUENT_BUTTON_TEST_ID,
  SOLANA_SNAP_SIGN_MESSAGE_CONFIRM_TEST_ID,
  SOLANA_SNAP_TRANSACTION_CONFIRM_TEST_ID,
  SolanaTestDappSelectorsWebIDs,
} from '../../selectors/Browser/SolanaTestDapp.selectors';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { SigningBottomSheetSelectorsIDs } from '../../../app/components/Views/confirmations/legacy/components/SigningBottomSheet.testIds';

/**
 * Get a test element by data-testid
 * @param dataTestId - The data-testid of the element
 * @param options.tag - The tag of the element having the data-testid attribute (e.g. 'div', 'input', etc.). Defaults to 'div'
 * @param options.extraXPath - The extra xpath to the element (e.g. '/div/button'), useful for accessing elements we aren't able to assign a data-testid to
 * @returns The test element
 */
function getTestElement(
  dataTestId: string,
  options: { extraXPath?: string; tag?: string } = {},
): Promise<DetoxElement | WebElement> {
  const { tag = 'div', extraXPath = '' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
  );
}

/**
 * Class to interact with the Multichain Test DApp via the WebView
 */
class SolanaTestDApp {
  get connectButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.connect, {
      extraXPath: '/div/button',
    });
  }

  get disconnectButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.disconnect, {
      extraXPath: '/button',
    });
  }

  get endpointSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.endpoint, {
      tag: 'input',
    });
  }

  get walletButtonSelector(): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      SolanaTestDappSelectorsWebIDs.WALLET_BUTTON,
    );
  }

  get confirmTransactionButtonSelector(): WebElement {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get confirmSignMessageButtonSelector(): WebElement {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  /**
   * Cancel on the Solana sign-and-send confirmation (redesigned confirmations footer
   * testID `cancel-button`, not the legacy snap-only cancel footer id).
   */
  get cancelSignAndSendTransactionButtonSelector(): DetoxElement {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  get cancelButtonSelector() {
    return Matchers.getElementByText('Cancel');
  }

  async navigateToSolanaTestDApp(): Promise<void> {
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(getTestDappLocalUrl());

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  async reloadSolanaTestDApp(): Promise<void> {
    await Browser.reloadTab();
  }

  /**
   * Tap a button in the WebView
   */
  async tapButton(webElement: WebElement): Promise<void> {
    await Gestures.scrollToWebViewPort(webElement);
    await Gestures.tap(webElement);
  }

  getHeader() {
    return {
      connect: async () => {
        await this.tapButton(this.connectButtonSelector);
      },
      disconnect: async () => {
        await this.tapButton(this.disconnectButtonSelector);
      },
      selectMetaMask: async () => {
        await this.tapButton(this.walletButtonSelector);
      },
      getConnectionStatus: async () => {
        const connectionStatusDiv = await getTestElement(
          dataTestIds.testPage.header.connectionStatus,
        );
        return await connectionStatusDiv.getText();
      },
      getAccount: async () => {
        const account = await getTestElement(
          dataTestIds.testPage.header.account,
          { extraXPath: '/a' },
        );
        return await account.getText();
      },
    };
  }

  getSignMessageTest() {
    return {
      signMessage: async () => {
        await this.tapButton(
          getTestElement(dataTestIds.testPage.signMessage.signMessage, {
            tag: 'button',
          }),
        );
      },
      getSignedMessage: async () =>
        (
          await getTestElement(dataTestIds.testPage.signMessage.signedMessage, {
            tag: 'pre',
          })
        ).getText(),
    };
  }

  getSendSolTest() {
    return {
      /** Taps **Sign transaction** (sign-only) on the non-versioned Transfer SOL card. */
      signTransaction: async () => {
        await this.tapButton(
          getTestElement(dataTestIds.testPage.sendSol.signTransaction, {
            tag: 'button',
          }),
        );
      },
      /** Taps **Sign and send transaction** on the non-versioned Transfer SOL card. */
      sendTransaction: async () => {
        await this.tapButton(
          getTestElement(dataTestIds.testPage.sendSol.sendTransaction, {
            tag: 'button',
          }),
        );
      },
      getSignedTransaction: async () =>
        (
          await getTestElement(dataTestIds.testPage.sendSol.signedTransaction, {
            tag: 'pre',
          })
        ).getText(),
      getTransactionHash: async () =>
        (
          await getTestElement(dataTestIds.testPage.sendSol.transactionHash, {
            tag: 'pre',
          })
        ).getText(),
    };
  }

  async confirmTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.confirmTransactionButtonSelector, {
      elemDescription: 'Solana transaction confirmation Confirm button',
    });
  }

  async confirmSignMessage(): Promise<void> {
    // Solana Wallet Standard uses @metamask/solana-wallet-snap UI: SnapUIFooterButton
    // testID is `${name}-snap-footer-button` (e.g. confirm-sign-message-confirm-snap-footer-button).
    // Redesigned EVM confirmations use `confirm-button`; legacy signing used
    // `request-signature-confirm-button` (removed).
    //
    // Android: Detox visibility requires ≥75% of the view visible; snap footer buttons in the
    // slide-up modal can exist and be tappable but still fail that check — wait for existence,
    // then tap with visibility checks relaxed on Android only.
    const confirmSelectors = [
      SOLANA_SNAP_SIGN_MESSAGE_CONFIRM_TEST_ID,
      SOLANA_SNAP_TRANSACTION_CONFIRM_TEST_ID,
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
      BOTTOM_SHEET_FOOTER_SUBSEQUENT_BUTTON_TEST_ID,
      SigningBottomSheetSelectorsIDs.SIGN_BUTTON,
    ] as const;

    const relaxSnapFooterVisibility = device.getPlatform() === 'android';

    let lastError: unknown;
    for (let i = 0; i < confirmSelectors.length; i += 1) {
      const testId = confirmSelectors[i];
      try {
        const el = await Matchers.getElementByID(testId);
        const existenceTimeout = i === 0 ? 28000 : 12000;
        await waitFor(el).toExist().withTimeout(existenceTimeout);

        await Gestures.waitAndTap(Promise.resolve(el), {
          elemDescription: `Solana sign message confirmation (${testId})`,
          delay: i === 0 ? 1800 : 0,
          timeout: 8000,
          checkVisibility: !relaxSnapFooterVisibility,
          checkEnabled: !relaxSnapFooterVisibility,
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    try {
      const confirmByLabel = await Matchers.getElementByText('Confirm');
      await waitFor(confirmByLabel).toExist().withTimeout(15000);
      await Gestures.waitAndTap(Promise.resolve(confirmByLabel), {
        elemDescription: 'Solana sign message confirmation (Confirm label)',
        timeout: 8000,
        checkVisibility: !relaxSnapFooterVisibility,
        checkEnabled: !relaxSnapFooterVisibility,
      });
    } catch {
      throw lastError;
    }
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButtonSelector, {
      elemDescription: 'Cancel button',
    });
  }

  /**
   * Dismisses the Solana sign-and-send transaction confirmation (e.g. transfer SOL test).
   */
  async tapCancelSignAndSendTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.cancelSignAndSendTransactionButtonSelector, {
      elemDescription: 'Solana sign-and-send confirmation Cancel button',
      delay: 1800,
    });
  }
}

export default new SolanaTestDApp();
