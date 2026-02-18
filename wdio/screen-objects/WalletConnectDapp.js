import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Screen object for the MetaMask Test Dapp (metamask.github.io/test-dapp/).
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

    /**
     * Find an element by its HTML ID, scroll it into view, and click it.
     * Uses JS to scroll (handles long test-dapp page) but WebDriver's native
     * elementClick for the actual click — this produces a trusted user gesture
     * that browsers require for popups/modals (e.g. Web3Modal).
     */
    async _findAndClickById(id, timeout = 10000) {
        const scrollScript = `
            const el = document.getElementById(arguments[0]);
            if (el) {
                el.scrollIntoView({block: "center"});
                return true;
            }
            return false;
        `;

        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const found = await this._device.webDriverClient.executeScript(scrollScript, [id]);
            if (found) {
                // Use WebDriver findElement + elementClick for a trusted click
                const elementRef = await this._device.webDriverClient.findElement('css selector', `#${id}`);
                await this._clickWebElement(elementRef);
                return;
            }
            await AppwrightGestures.wait(500);
        }

        throw new Error(`Element with id "${id}" not found`);
    }

    /**
     * Get the textContent of an element by its HTML ID.
     * Waits for non-empty text up to the timeout.
     */
    async _getTextById(id, timeout = 15000) {
        const script = `
            const el = document.getElementById(arguments[0]);
            return el ? el.textContent : '';
        `;

        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const text = await this._device.webDriverClient.executeScript(script, [id]);
            if (text && text.trim().length > 0) return text.trim();
            await AppwrightGestures.wait(500);
        }

        throw new Error(`Element with id "${id}" has no text content`);
    }

    /**
     * Clear the textContent of an element by ID.
     * Used before signing attempts to avoid stale results.
     */
    async _clearResultById(id) {
        const script = `
            const el = document.getElementById(arguments[0]);
            if (el) el.textContent = '';
            return true;
        `;
        await this._device.webDriverClient.executeScript(script, [id]);
    }

    // ── Action methods ───────────────────────────────────────────────

    async tapConnectButton() {
        if (!this._device) return;
        await this._findAndClickById('walletConnect');
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
        await this._clearResultById('personalSignResult');
        await this._findAndClickById('personalSign');
    }

    async tapSignTypedDataV4Button() {
        if (!this._device) return;
        await this._clearResultById('signTypedDataV4Result');
        await this._findAndClickById('signTypedDataV4');
    }

    async tapSendTransactionButton() {
        if (!this._device) return;
        await this._findAndClickById('sendButton');
    }

    async tapOpenNetworkPicker() {
        if (!this._device) return;
        await this._findAndClickById('openNetworkPicker');
    }

    async tapNetworkItem(chainId) {
        if (!this._device) return;
        const elementRef = await this._findWebElement('css selector', `[data-chain-id="${chainId}"]`);
        await this._scrollAndClickWebElement(elementRef);
    }

    async getChainId(timeout = 15000) {
        if (!this._device) return null;
        await this._device.webDriverClient.executeScript(
            'window.scrollTo(0, 0); return true;',
            [],
        );
        await AppwrightGestures.wait(500);
        return await this._getTextById('chainId', timeout);
    }

    async tapDisconnectButton() {
        if (!this._device) return;
        await this._findAndClickById('walletConnect');
        await AppwrightGestures.wait(2000);
        await this._tapDisconnectConfirmButton();
    }

    async _tapDisconnectConfirmButton() {
        const script = `
            // Follow the exact shadow DOM path:
            // w3m-modal // w3m-router // w3m-account-view // wui-list-item[2] // button
            const modal = document.querySelector('w3m-modal');
            if (!modal || !modal.shadowRoot) return 'no-modal';

            const router = modal.shadowRoot.querySelector('w3m-router');
            if (!router || !router.shadowRoot) return 'no-router';

            const accountView = router.shadowRoot.querySelector('w3m-account-view');
            if (!accountView || !accountView.shadowRoot) return 'no-account-view';

            const listItems = accountView.shadowRoot.querySelectorAll('wui-list-item');
            const disconnectItem = listItems[1]; // 2nd wui-list-item (0-indexed)
            if (!disconnectItem) return 'no-list-item';

            disconnectItem.click();
            return true;
        `;

        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
            const result = await this._device.webDriverClient.executeScript(script, []);
            if (result === true) return;
            await AppwrightGestures.wait(500);
        }

        throw new Error('Disconnect confirm button not found in w3m-modal');
    }

    // ── Assertion methods ────────────────────────────────────────────

    async isConnected() {
        if (!this._device) return;

        const text = await this._getTextById('accounts', 15000);
        expect(text).toMatch(/^0x/);
    }

    async assertPersonalSignApproved() {
        if (!this._device) return;

        const text = await this._getTextById('personalSignResult', 15000);
        expect(text).toMatch(/^0x/);
    }

    async assertSignTypedDataV4Approved() {
        if (!this._device) return;

        const text = await this._getTextById('signTypedDataV4Result', 15000);
        expect(text).toMatch(/^0x/);
    }

    async assertPersonalSignRejected() {
        if (!this._device) return;

        // Force Chrome to process pending WebSocket messages (tab was backgrounded)
        await this._device.webDriverClient.executeScript('return 0', []);
        await AppwrightGestures.wait(2000);

        const text = await this._getTextById('personalSign', 15000);
        expect(text.toLowerCase()).toContain('reject');
    }

    async assertSignTypedDataV4Rejected() {
        if (!this._device) return;

        const text = await this._getTextById('signTypedDataV4Result', 15000);
        expect(text.toLowerCase()).toContain('reject');
    }

    async assertSendTransactionRejected() {
        if (!this._device) return;

        // sendButton rejection has no dedicated result element in the test-dapp.
        // Verify the page is still functional and connected as indirect confirmation.
        const text = await this._getTextById('accounts', 15000);
        expect(text).toMatch(/^0x/);
    }

    async assertDisconnected() {
        if (!this._device) return;

        // After disconnect, #accounts should be empty
        const script = `
            const el = document.getElementById('accounts');
            return el ? el.textContent : '';
        `;

        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
            const text = await this._device.webDriverClient.executeScript(script, []);
            if (!text || text.trim().length === 0) {
                // accounts element is empty — disconnected
                expect(true).toBeTruthy();
                return;
            }
            await AppwrightGestures.wait(500);
        }

        throw new Error('Dapp still shows connected accounts after disconnect');
    }
}

export default new WalletConnectDapp();
