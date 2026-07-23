/**
 * E2E tests for MMConnect Multichain (@metamask/connect-multichain) driven
 * inside MetaMask Mobile's in-app browser (ported from the extension spec
 * `metamask-extension/test/e2e/tests/mm-connect/connect-multichain.spec.ts`).
 * `wallet_createSession` / `wallet_invokeMethod` / `wallet_revokeSession`
 * route via the in-app bridge to `ConnectBottomSheet` and the redesigned
 * confirmation footer.
 *
 * Scope: a single Localhost/Anvil (eip155:1337) session — the dapp
 * pre-selects eip155:1337 when served from localhost (always the case under
 * e2e), and the default fixture ships a matching 0x539 "Localhost" network
 * backed by the test-run Anvil node.
 */
import { SmokeMultiChainAPI } from '../../../tags';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import MMConnectBrowserPlaygroundDapp from '../../../page-objects/Browser/MMConnectBrowserPlaygroundDapp';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import Browser from '../../../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal';

const LOCALHOST_SCOPE = 'eip155:1337';
// Hex chain id for `eip155:1337` — what `eth_chainId` returns for the
// Localhost/Anvil network. We only assert containment because the dapp wraps
// the JSON-RPC result in `"<value>"` and may add whitespace/newlines.
const LOCALHOST_CHAIN_ID_HEX = '0x539';

describe(SmokeMultiChainAPI('MMConnect Multichain (in-app browser)'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('routes personal_sign via the scope card and terminates on wallet_revokeSession', async () => {
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
          // 1. Multichain connect — the dapp pre-selects eip155:1337 in the
          //    DynamicInputs section, so we can tap Connect directly.
          await MMConnectBrowserPlaygroundDapp.tapConnectMultichain();
          await ConnectBottomSheet.tapConnectButton();

          // 2. Scopes section + per-scope card render once
          //    `wallet_createSession` resolves with non-empty sessionScopes.
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionVisible();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            LOCALHOST_SCOPE,
          );

          // 3. Signing request via the scope card: select personal_sign in
          //    the per-scope method picker, tap Invoke, confirm in MetaMask,
          //    then verify the result code element contains a hex string.
          await MMConnectBrowserPlaygroundDapp.selectScopeCardMethod(
            LOCALHOST_SCOPE,
            'personal_sign',
          );
          await MMConnectBrowserPlaygroundDapp.invokeScopeCardMethod(
            LOCALHOST_SCOPE,
          );
          // personal_sign uses the redesigned confirmation surface, so confirm
          // via the shared footer rather than the legacy signing bottom sheet.
          await FooterActions.tapConfirmButton();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardResultContains(
            LOCALHOST_SCOPE,
            'personal_sign',
            '0x',
          );

          // 4. Disconnect: "Disconnect All" calls sdkDisconnect() →
          //    wallet_revokeSession. The scopes section unmounting confirms
          //    both the dapp's local session state and the wallet-side
          //    permission have been cleared.
          await MMConnectBrowserPlaygroundDapp.tapDisconnectAll();
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionNotVisible();
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('restores the multichain session after a page refresh', async () => {
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
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        await device.disableSynchronization();
        try {
          // Establish the multichain session for the default eip155:1337 scope.
          await MMConnectBrowserPlaygroundDapp.tapConnectMultichain();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionVisible();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            LOCALHOST_SCOPE,
          );

          // Soft refresh the in-app browser tab. The dapp re-mounts and
          // MMConnect's multichain provider should re-hydrate session scopes
          // from its persisted CAIP-25 storage without prompting the wallet.
          await MMConnectBrowserPlaygroundDapp.reloadDapp();
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionVisible();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            LOCALHOST_SCOPE,
          );

          // The session is still usable: `eth_chainId` round-trips through
          // `wallet_invokeMethod` without a re-connect.
          await MMConnectBrowserPlaygroundDapp.selectScopeCardMethod(
            LOCALHOST_SCOPE,
            'eth_chainId',
          );
          await MMConnectBrowserPlaygroundDapp.invokeScopeCardMethod(
            LOCALHOST_SCOPE,
          );
          await MMConnectBrowserPlaygroundDapp.assertScopeCardResultContains(
            LOCALHOST_SCOPE,
            'eth_chainId',
            LOCALHOST_CHAIN_ID_HEX,
          );
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('terminates the multichain session when the wallet revokes all permissions', async () => {
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
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        // Establish a multichain session for the default eip155:1337 scope so
        // there is something to revoke from the wallet side.
        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.tapConnectMultichain();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionVisible();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            LOCALHOST_SCOPE,
          );
        } finally {
          await device.enableSynchronization();
        }

        // Wallet-side revoke (counterpart of the dapp-initiated
        // `wallet_revokeSession` in the personal_sign spec): connection bar →
        // Disconnect all accounts and networks → Confirm. The multichain
        // provider should observe `wallet_sessionChanged` with empty
        // sessionScopes and tear the scopes section down on its own.
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.assertScopesSectionNotVisible();
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('returns the correct eth_chainId for the connected EVM scope', async () => {
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
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        await device.disableSynchronization();
        try {
          // Open the multichain session for the default (eip155:1337) scope.
          await MMConnectBrowserPlaygroundDapp.tapConnectMultichain();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertScopeCardVisible(
            LOCALHOST_SCOPE,
          );

          // `eth_chainId` is a non-interactive read — no MetaMask confirmation
          // prompt should appear. The dapp's per-scope JSON-RPC routing must
          // return the hex chain id matching the scope it was invoked on.
          await MMConnectBrowserPlaygroundDapp.selectScopeCardMethod(
            LOCALHOST_SCOPE,
            'eth_chainId',
          );
          await MMConnectBrowserPlaygroundDapp.invokeScopeCardMethod(
            LOCALHOST_SCOPE,
          );
          await MMConnectBrowserPlaygroundDapp.assertScopeCardResultContains(
            LOCALHOST_SCOPE,
            'eth_chainId',
            LOCALHOST_CHAIN_ID_HEX,
          );
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });
});
