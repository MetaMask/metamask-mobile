import { test } from 'appwright';

import { login } from '../../utils/Flows.js';
import {
  launchMobileBrowser,
  navigateToDapp,
  refreshMobileBrowser,
} from '../../utils/MobileBrowser.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import BrowserPlaygroundDapp from '../../../wdio/screen-objects/BrowserPlaygroundDapp.js';
import AndroidScreenHelpers from '../../../wdio/screen-objects/Native/Android.js';
import DappConnectionModal from '../../../wdio/screen-objects/Modals/DappConnectionModal.js';
import SignModal from '../../../wdio/screen-objects/Modals/SignModal.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import {
  StandaloneDappServer,
  DappVariants,
} from '../../../tests/framework/index.ts';

// Local server configuration
const DAPP_PORT = 8090;
const DAPP_NAME = 'MetaMask MultiChain API Test Dapp';

// NOTE: This test requires the testing SRP to be used
const ACCOUNT_1_ADDRESS = '0x19a7Ad8256ab119655f1D758348501d598fC1C94';
const ACCOUNT_3_ADDRESS = '0xE2bEca5CaDC60b61368987728b4229822e6CDa83';

const playgroundServer = new StandaloneDappServer(
  DappVariants.BROWSER_PLAYGROUND,
  DAPP_PORT,
);

// Start local playground server before all tests
test.beforeAll(async () => {
  await playgroundServer.start();
});

// Stop local playground server after all tests
test.afterAll(async () => {
  await playgroundServer.stop();
});

test('@metamask/connect-evm - Connect via EVM Legacy Connection to Local Browser Playground', async ({
  device,
}) => {
  const platform = device.getPlatform?.() || 'android';
  const DAPP_URL = playgroundServer.getUrl(platform);

  WalletMainScreen.device = device;
  BrowserPlaygroundDapp.device = device;
  AndroidScreenHelpers.device = device;
  DappConnectionModal.device = device;
  SignModal.device = device;
  SwitchChainModal.device = device;
  AccountListComponent.device = device;

  await device.webDriverClient.updateSettings({
    waitForIdleTimeout: 100,
    waitForSelectorTimeout: 0,
    shouldWaitForQuiescence: false,
  });

  await AppwrightHelpers.withNativeAction(device, async () => {
    await login(device);
    await launchMobileBrowser(device);
    await navigateToDapp(device, DAPP_URL, DAPP_NAME);
  });
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapConnectLegacy();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapEditAccountsButton();
    await DappConnectionModal.tapAccountButton('Account 3');
    await DappConnectionModal.tapUpdateAccountsButton();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_1_ADDRESS);
      await BrowserPlaygroundDapp.tapPersonalSign();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapConfirmButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertResponseValue(
        // Account 1 signed the message
        '0x361c13288b4ab02d50974efddf9e4e7ca651b81c298b614be908c4754abb1dd8328224645a1a8d0fab561c4b855c7bdcebea15db5ae8d1778a1ea791dbd05c2a1b',
      );
      await BrowserPlaygroundDapp.tapSendTransaction();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Note: Error message may differ slightly in browser playground
      await BrowserPlaygroundDapp.assertResponseValue('denied');
      await BrowserPlaygroundDapp.tapSwitchToPolygon();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SwitchChainModal.assertNetworkText('Polygon');
    await SwitchChainModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertChainIdValue('0x89');
      await BrowserPlaygroundDapp.tapSendTransaction();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Polygon');
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapSwitchToMainnet();
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.tapSendTransaction();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.assertNetworkText('Ethereum');
    await SignModal.tapCancelButton();

    // Wait here to make sure UI is visible before attempted interaction
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Change selected account to Account 3 in MetaMask
    await WalletMainScreen.tapIdenticon();
    await AccountListComponent.isComponentDisplayed();
    await AccountListComponent.tapOnAccountByName('Account 3');
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      // Verify account changed to Account 3
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
      await BrowserPlaygroundDapp.tapPersonalSign();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertResponseValue('rejected');
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
      await BrowserPlaygroundDapp.assertConnected(false);
      await BrowserPlaygroundDapp.tapConnectLegacy();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
      await BrowserPlaygroundDapp.assertActiveAccount(ACCOUNT_3_ADDRESS);
      await BrowserPlaygroundDapp.tapPersonalSign();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await SignModal.tapCancelButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertResponseValue('rejected');
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
      await BrowserPlaygroundDapp.tapConnectLegacy();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    // Purposely not interacting with the approval
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withNativeAction(device, async () => {
    await refreshMobileBrowser(device);
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(false);
    },
    DAPP_URL,
  );

  await new Promise((resolve) => setTimeout(resolve, 10000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(false);
      await BrowserPlaygroundDapp.tapConnectLegacy();
    },
    DAPP_URL,
  );

  await AppwrightHelpers.withNativeAction(device, async () => {
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await DappConnectionModal.tapConnectButton();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  await launchMobileBrowser(device);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.assertConnected(true);
      await BrowserPlaygroundDapp.assertChainIdValue('0x1');
    },
    DAPP_URL,
  );

  //
  // Read-only method should hit rpc endpoint instead of wallet
  //

  await AppwrightGestures.terminateApp(device);
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapGetBalance();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      // Balance response should contain "Balance:" prefix
      await BrowserPlaygroundDapp.assertResponseValue('Balance:');
    },
    DAPP_URL,
  );

  //
  // Reset dapp state
  //

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await BrowserPlaygroundDapp.tapDisconnect();
    },
    DAPP_URL,
  );
});
