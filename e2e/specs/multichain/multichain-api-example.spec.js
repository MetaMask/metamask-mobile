'use strict';
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';

describe(SmokeNetworkExpansion('Multichain API Tests'), () => {
    beforeAll(async () => {
        jest.setTimeout(150000);
        await TestHelpers.reverseServerPort();
    });

    it('should load the multichain test dapp', async () => {
        await withFixtures(
            {
                dapp: true,
                multichainDapp: true,
                disableGanache: true, // Disable all local blockchain nodes
                fixture: new FixtureBuilder()
                    .withPopularNetworks()
                    .build(),
                restartDevice: true,
            },
            async () => {
                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                await MultichainTestDApp.navigateToMultichainTestDApp();

                // Verify the dapp loaded successfully by checking for the connect button
                await Assertions.webViewElementExists(MultichainTestDApp.connectButton);

                console.log('Multichain test dapp loaded successfully!');
            },
        );
    });
});
