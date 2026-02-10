import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Screen object for the WalletConnect React App (react-app.walletconnect.com).
 *
 * Unlike mm-connect screen objects that use AppwrightSelectors.getElementByXpath
 * (which resolves native Android XPath), this dapp runs in Chrome's webview.
 * When the Appwright context is switched to WEBVIEW_chrome, web elements are
 * not accessible via native selectors. Instead we use the raw WebDriver
 * findElement/elementClick API, which operates on the web DOM directly.
 */
class WalletConnectDapp {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    // ── Private helpers ──────────────────────────────────────────────

    /**
     * Find a web element via WebDriver in the current webview context.
     * Returns the raw W3C element reference object.
     */
    async _findWebElement(strategy, selector, timeout = 10000) {
        const deadline = Date.now() + timeout;
        let lastError;

        while (Date.now() < deadline) {
            try {
                return await this._device.webDriverClient.findElement(strategy, selector);
            } catch (e) {
                lastError = e;
                await AppwrightGestures.wait(500);
            }
        }

        throw lastError || new Error(`Element not found: ${selector}`);
    }

    /**
     * Click a raw W3C element reference (returned by findElement).
     */
    async _clickWebElement(elementRef) {
        const elementId = Object.values(elementRef)[0];
        await this._device.webDriverClient.elementClick(elementId);
    }

    /**
     * Scroll a web element into view, then click it.
     * Uses elementClick (which auto-scrolls per W3C spec). If the click is
     * intercepted by an overlay, falls back to JS click.
     */
    async _scrollAndClickWebElement(elementRef) {
        try {
            await this._clickWebElement(elementRef);
        } catch (e) {
            if (e && e.message && e.message.includes('click intercepted')) {
                // Overlay blocking — click away to dismiss, then retry
                await this._device.webDriverClient.executeScript(
                    'document.elementFromPoint(0,0)?.click?.(); ' +
                    'return true;',
                    [],
                );
                // Re-attempt after dismissing potential overlay
                await AppwrightGestures.wait(500);
                await this._clickWebElement(elementRef);
            } else {
                throw e;
            }
        }
    }

    /**
     * Find a button by its text content via JS and click it.
     * Bypasses WebDriver elementClick overlay checks entirely.
     */
    async _findAndClickButtonByText(text, timeout = 10000) {
        const script = `
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                if (btn.textContent.includes(arguments[0])) {
                    btn.scrollIntoView({block: "center"});
                    btn.click();
                    return true;
                }
            }
            return false;
        `;

        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const clicked = await this._device.webDriverClient.executeScript(script, [text]);
            if (clicked) return;
            await AppwrightGestures.wait(500);
        }

        throw new Error(`Button with text "${text}" not found`);
    }

    /**
     * Get the text content of a raw W3C element reference.
     */
    async _getWebElementText(elementRef) {
        const elementId = Object.values(elementRef)[0];
        return await this._device.webDriverClient.getElementText(elementId);
    }

    /**
     * Find a button by text inside shadow DOM trees (e.g. Web3Modal) and click it.
     * Regular XPath cannot pierce shadow roots, so we use JS to traverse them.
     */
    async _clickShadowDomButton(text, timeout = 10000) {
        const script = `
            function findInShadow(root, text) {
                for (const el of root.querySelectorAll('button')) {
                    if (el.textContent.includes(text)) return el;
                }
                for (const el of root.querySelectorAll('*')) {
                    if (el.shadowRoot) {
                        const found = findInShadow(el.shadowRoot, text);
                        if (found) return found;
                    }
                }
                return null;
            }
            const btn = findInShadow(document, arguments[0]);
            if (btn) { btn.click(); return true; }
            return false;
        `;

        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const clicked = await this._device.webDriverClient.executeScript(script, [text]);
            if (clicked) return;
            await AppwrightGestures.wait(500);
        }

        throw new Error(`Shadow DOM button with text "${text}" not found`);
    }

    // ── Action methods ───────────────────────────────────────────────

    async tapEthereumSepolia() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//p[contains(text(), "Ethereum Sepolia")]',
        );
        await this._clickWebElement(el);
    }

    async tapConnectButton() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//button[contains(text(), "Connect")]',
        );
        await this._scrollAndClickWebElement(el);
    }

    async tapMetaMaskOption() {
        if (!this._device) return;
        await this._clickShadowDomButton('MetaMask');
    }

    async tapOpenButton() {
        if (!this._device) return;
        await this._clickShadowDomButton('Open');
    }

    async tapPersonalSignButton() {
        if (!this._device) return;
        await this._findAndClickButtonByText('personal_sign');
    }

    async tapSignTypedDataV4Button() {
        if (!this._device) return;
        await this._findAndClickButtonByText('eth_signTypedData_v4');
    }

    async tapSendTransactionButton() {
        if (!this._device) return;
        await this._findAndClickButtonByText('eth_sendTransaction');
    }

    async tapDisconnectButton() {
        if (!this._device) return;
        await this._findAndClickButtonByText('Disconnect');
    }

    // ── Assertion methods ────────────────────────────────────────────

    async isConnected() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//*[contains(., "Disconnect")]',
            15000,
        );
        expect(el).toBeTruthy();
    }

    async assertRequestApproved() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//*[contains(text(), "JSON-RPC Request Approved")]',
            15000,
        );
        expect(el).toBeTruthy();
    }

    async assertRequestRejected() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//*[contains(text(), "JSON-RPC Request Rejected")]',
            15000,
        );
        expect(el).toBeTruthy();
    }

    async assertDisconnected() {
        if (!this._device) return;

        const el = await this._findWebElement(
            'xpath',
            '//*[contains(., "Connect")]',
            15000,
        );
        expect(el).toBeTruthy();
    }
}

export default new WalletConnectDapp();
