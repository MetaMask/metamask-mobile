// Migrated to tests/page-objects/MMConnect/SnapSignModal.ts
import AppwrightSelectors from '../../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Modal for Snap-rendered confirmation dialogs (e.g. Solana signing).
 *
 * Snap UIs use SnapUIFooterButton with testIDs following the pattern
 * "${name}-snap-footer-button". This modal locates the confirm/submit
 * button via XPath, excluding cancel and default buttons.
 */
class SnapSignModal {
    constructor() {}

    get device() {
        return this._device;
    }

    set device(device) {
        this._device = device;
    }

    get confirmButton() {
        if (!this._device) {
            return null;
        }

        const xpath =
            '//*[contains(@resource-id,"snap-footer-button") ' +
            'and not(contains(@resource-id,"cancel")) ' +
            'and not(contains(@resource-id,"default-snap-footer-button"))]';
        return AppwrightSelectors.getElementByXpath(this._device, xpath);
    }

    get cancelButton() {
        if (!this._device) {
            return null;
        }

        const xpath =
            '//*[contains(@resource-id,"cancel") ' +
            'and contains(@resource-id,"snap-footer-button")]';
        return AppwrightSelectors.getElementByXpath(this._device, xpath);
    }

    async tapConfirmButton({ timeout = 5000 } = {}) {
        if (!this._device) {
            return;
        }

        const snapBtn = await this.confirmButton;
        await expect(snapBtn).toBeVisible({ timeout });
        await AppwrightGestures.tap(snapBtn);
    }

    async tapCancelButton({ timeout = 5000 } = {}) {
        if (!this._device) {
            return;
        }

        const snapBtn = await this.cancelButton;
        await expect(snapBtn).toBeVisible({ timeout });
        await AppwrightGestures.tap(snapBtn);
    }
}

export default new SnapSignModal();
