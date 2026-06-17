/**
 * E2E test for MMConnect Legacy EVM (@metamask/connect-evm) flowing through
 * MetaMask Mobile's in-app browser.
 *
 * Ported from the extension spec
 * `metamask-extension/test/e2e/tests/mm-connect/connect-evm.spec.ts`.
 *
 * In contrast to the perf-suite tests under `tests/performance/mm-connect/` —
 * which drive the dapp from an external Chrome/Safari browser over Appium —
 * this spec runs the dapp inside MetaMask's own WebView (BrowserTab) using
 * Detox. The dapp talks to MetaMask via the in-app `window.ethereum` bridge,
 * so EIP-1193 calls route directly to the standard `ConnectBottomSheet` /
 * `SigningBottomSheet` confirmations.
 */
import { SmokeMultiChainAPI } from '../../../tags';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import MMConnectBrowserPlaygroundDapp from '../../../page-objects/Browser/MMConnectBrowserPlaygroundDapp';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import SigningBottomSheet from '../../../page-objects/Browser/SigningBottomSheet';

describe(SmokeMultiChainAPI('MMConnect Legacy EVM (in-app browser)'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('connects via Legacy EVM, completes personal_sign, and disconnects', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.BROWSER_PLAYGROUND,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        // Login + browser-view navigation rely on Detox idle sync to settle
        // the tab bar layout (Explore tab sits inside the bottom safe area).
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        // BrowserTab + WebView + ConnectBottomSheet + SigningBottomSheet
        // keep the main run loop busy enough that Detox's idle sync can
        // mis-report "app is busy". The Solana wallet-standard spec hits the
        // same pattern; mirror its workaround here.
        await device.disableSynchronization();
        try {
          // 1. Connect via Legacy EVM
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();

          // 2. Account / chain display: Legacy EVM card renders the active
          //    account address and chain ID after the connect promise resolves.
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();

          // 3. Signing request: personal_sign → confirm → verify the dapp
          //    received a 0x... signature.
          await MMConnectBrowserPlaygroundDapp.tapLegacyPersonalSign();
          await SigningBottomSheet.tapSignButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmResponseContains(
            '0x',
          );

          // 4. Disconnect: "Disconnect All" calls sdkDisconnect() →
          //    wallet_revokeSession; the Legacy EVM card unmounts.
          await MMConnectBrowserPlaygroundDapp.tapDisconnectAll();
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });
});
