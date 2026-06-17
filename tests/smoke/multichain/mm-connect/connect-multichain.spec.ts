/**
 * E2E test for MMConnect Multichain (@metamask/connect-multichain) flowing
 * through MetaMask Mobile's in-app browser.
 *
 * Ported from the extension spec
 * `metamask-extension/test/e2e/tests/mm-connect/connect-multichain.spec.ts`.
 *
 * Like the Legacy EVM sibling spec, this drives the dapp inside the in-app
 * browser rather than an external Chrome/Safari instance. The dapp talks to
 * MetaMask via the in-app bridge, so `wallet_createSession`,
 * `wallet_invokeMethod`, and `wallet_revokeSession` route directly to the
 * standard `ConnectBottomSheet` / `SigningBottomSheet` confirmations.
 *
 * Scope: a single Ethereum mainnet (eip155:1) session — that is the default
 * scope pre-selected by the dapp's DynamicInputs UI. Adding additional
 * scopes (e.g. Polygon, Linea, Solana) requires toggling per-scope
 * checkboxes; the page object exposes `ensureScopeSelected` for that and the
 * scenario is intentionally deferred (see README.md).
 */
import { SmokeMultiChainAPI } from '../../../tags';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import MMConnectBrowserPlaygroundDapp from '../../../page-objects/Browser/MMConnectBrowserPlaygroundDapp';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import SigningBottomSheet from '../../../page-objects/Browser/SigningBottomSheet';

const ETHEREUM_MAINNET_SCOPE = 'eip155:1';

describe(SmokeMultiChainAPI('MMConnect Multichain (in-app browser)'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('opens a multichain session for eip155:1, signs via the scope card, and disconnects', async () => {
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

        await device.disableSynchronization();
        try {
          // 1. Multichain connect — the dapp pre-selects eip155:1 in the
          //    DynamicInputs section, so we can tap Connect directly.
          await MMConnectBrowserPlaygroundDapp.tapConnectMultichain();
          await ConnectBottomSheet.tapConnectButton();

          // 2. Scope display: the scopes section + per-scope card render
          //    once `wallet_createSession` resolves with a non-empty
          //    sessionScopes.
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionVisible();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            ETHEREUM_MAINNET_SCOPE,
          );

          // 3. Signing request via the scope card: select personal_sign in
          //    the per-scope method picker, tap Invoke, confirm in MetaMask,
          //    then verify the result code element contains a hex string.
          await MMConnectBrowserPlaygroundDapp.selectScopeCardMethod(
            ETHEREUM_MAINNET_SCOPE,
            'personal_sign',
          );
          await MMConnectBrowserPlaygroundDapp.invokeScopeCardMethod(
            ETHEREUM_MAINNET_SCOPE,
          );
          await SigningBottomSheet.tapSignButton();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardResultContains(
            ETHEREUM_MAINNET_SCOPE,
            'personal_sign',
            '0x',
          );

          // 4. Disconnect: "Disconnect All" calls sdkDisconnect() →
          //    wallet_revokeSession; the scopes section unmounts.
          await MMConnectBrowserPlaygroundDapp.tapDisconnectAll();
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionNotVisible();
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });
});
