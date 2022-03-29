const assert = require('assert');

class SettingsPage {

    getObjectLocator() {
        const platform = browser.capabilities.platformName.toLowerCase();
        return require(`./../screens/native/${platform}/settings.screen.js`);
    }

    getSettingsMenuItem() {
        return `//XCUIElementTypeCell[@label="General"]`;
    }

    launchApp() {

    }

    async verifyGeneralLabel() {
        const label = await $(this.getSettingsMenuItem()).getText();
        assert.equal(label, 'General');
    }
}

module.exports = new SettingsPage();