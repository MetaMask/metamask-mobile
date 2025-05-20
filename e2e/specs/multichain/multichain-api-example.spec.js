'use strict';
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';

describe(SmokeNetworkExpansion('Multichain API Tests'), () => {
    beforeAll(async () => {
        jest.setTimeout(150000);
        await TestHelpers.reverseServerPort();
    });

    it('should connect to multichain dapp and create a session with multiple chains', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
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

                // Connect to the dapp
                await MultichainTestDApp.connect();
                await ConnectBottomSheet.tapConnectButton();

                // Create a session with specific EVM chains
                await MultichainTestDApp.initCreateSessionScopes(['eip155:1', 'eip155:1337']);

                // Verify the session was created correctly
                const session = await MultichainTestDApp.getSession();

                // Add your assertions here
                // For example, check that requested chains are in the session:
                // This is a placeholder - the actual implementation would depend on how
                // you retrieve and structure the session data from the test dapp
                // 
                // Example assertion could be:
                // expect(session.sessionScopes['eip155:1']).toBeDefined();
                // expect(session.sessionScopes['eip155:1337']).toBeDefined();
            },
        );
    });
});
