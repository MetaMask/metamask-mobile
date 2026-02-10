import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Screen object for the WalletConnect Sessions view inside MetaMask.
 *
 * Navigation: Wallet → Hamburger menu → Settings → Experimental → View sessions
 *
 * This view lists all active WalletConnect v1/v2 sessions. Sessions can be
 * disconnected via long-press → ActionSheet → "End".
 */
class WalletConnectSessionsScreen {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    // ── Navigation selectors ──────────────────────────────────────────

    get hamburgerMenuButton() {
        return AppwrightSelectors.getElementByID(
            this._device,
            'navbar-hamburger-menu-button',
        );
    }

    get experimentalSettingsButton() {
        return AppwrightSelectors.getElementByID(
            this._device,
            'experimental-settings',
        );
    }

    get viewSessionsButton() {
        return AppwrightSelectors.getElementByText(
            this._device,
            'View sessions',
        );
    }

    get sessionsContainer() {
        return AppwrightSelectors.getElementByID(
            this._device,
            'wallet-connect-sessions-screen',
        );
    }

    // ── Navigation ────────────────────────────────────────────────────

    /**
     * Navigate from wallet home to the WalletConnect Sessions view.
     * Wallet → Hamburger → Experimental Settings → View sessions
     */
    async navigateToSessionsView() {
        if (!this._device) return;

        // Tap hamburger menu
        await AppwrightGestures.tap(await this.hamburgerMenuButton);
        await AppwrightGestures.wait(1500);

        // Scroll down to find and tap Experimental Settings
        await AppwrightGestures.scrollIntoView(
            this._device,
            this.experimentalSettingsButton,
            { maxScrollAttempts: 5 },
        );
        await AppwrightGestures.tap(await this.experimentalSettingsButton);
        await AppwrightGestures.wait(1500);

        // Scroll down to find and tap "View sessions"
        await AppwrightGestures.scrollIntoView(
            this._device,
            this.viewSessionsButton,
            { maxScrollAttempts: 5 },
        );
        await AppwrightGestures.tap(await this.viewSessionsButton);
        await AppwrightGestures.wait(1500);
    }

    // ── Session interactions ──────────────────────────────────────────

    /**
     * Long-press on a session row identified by its displayed name/URL text.
     * Uses WebDriver's `mobile: longClickGesture` since appwright's Locator
     * doesn't support long-press.
     */
    async longPressSession(sessionText) {
        if (!this._device) return;

        const sessionElement = await AppwrightSelectors.getElementByText(
            this._device,
            sessionText,
        );

        // Get the W3C element reference
        const elementRef = await sessionElement.getElement();
        if (!elementRef) {
            throw new Error(`Session element with text "${sessionText}" not found`);
        }

        const elementId = Object.values(elementRef)[0];

        // Use UiAutomator2's longClickGesture
        await this._device.webDriverClient.executeScript(
            'mobile: longClickGesture',
            [{ elementId, duration: 2000 }],
        );
    }

    /**
     * Tap "End" on the ActionSheet that appears after long-pressing a session.
     */
    async tapEndSessionButton() {
        if (!this._device) return;

        const endButton = await AppwrightSelectors.getElementByText(
            this._device,
            'End',
            true, // exact match to avoid matching "Send" etc.
        );
        await AppwrightGestures.tap(endButton);
    }

    /**
     * Dismiss the "Session ended" confirmation alert.
     */
    async dismissSessionEndedAlert() {
        if (!this._device) return;

        // The Alert has an "OK" button
        try {
            const okButton = await AppwrightSelectors.getElementByText(
                this._device,
                'OK',
                true,
            );
            if (await okButton.isVisible({ timeout: 5000 })) {
                await AppwrightGestures.tap(okButton);
            }
        } catch (_) {
            // Alert may auto-dismiss or not appear
        }
    }

    /**
     * Disconnect a session from within the sessions view.
     * Long-press → "End" → dismiss alert.
     */
    async disconnectSession(sessionText) {
        if (!this._device) return;

        await this.longPressSession(sessionText);
        await AppwrightGestures.wait(1000);
        await this.tapEndSessionButton();
        await AppwrightGestures.wait(1000);
        await this.dismissSessionEndedAlert();
        await AppwrightGestures.wait(1000);
    }

    // ── Assertions ────────────────────────────────────────────────────

    /**
     * Assert that a session with the given text (name or URL) is visible.
     */
    async assertSessionExists(sessionText) {
        if (!this._device) return;

        const sessionElement = await AppwrightSelectors.getElementByText(
            this._device,
            sessionText,
        );
        expect(await sessionElement.isVisible({ timeout: 10000 })).toBe(true);
    }

    /**
     * Assert that no active sessions are listed.
     * The view shows "You have no active sessions" when empty.
     */
    async assertNoActiveSessions() {
        if (!this._device) return;

        const emptyText = await AppwrightSelectors.getElementByText(
            this._device,
            'no active sessions',
        );
        expect(await emptyText.isVisible({ timeout: 10000 })).toBe(true);
    }

    /**
     * Navigate back from the sessions view (Android back button).
     */
    async goBack() {
        if (!this._device) return;
        await this._device.webDriverClient.back();
        await AppwrightGestures.wait(500);
    }
}

export default new WalletConnectSessionsScreen();
