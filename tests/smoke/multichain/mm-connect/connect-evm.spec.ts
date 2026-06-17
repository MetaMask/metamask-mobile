/**
 * E2E tests for MMConnect Legacy EVM (@metamask/connect-evm) flowing through
 * MetaMask Mobile's in-app browser.
 *
 * Ported from the extension spec
 * `metamask-extension/test/e2e/tests/mm-connect/connect-evm.spec.ts`. In
 * contrast to the perf-suite tests under `tests/performance/mm-connect/` —
 * which drive the dapp from an external Chrome/Safari browser over Appium —
 * this spec runs the dapp inside MetaMask's own WebView (BrowserTab) using
 * Detox. The dapp talks to MetaMask via the in-app `window.ethereum` bridge,
 * so EIP-1193 calls route directly to the standard `ConnectBottomSheet`,
 * `SigningBottomSheet`, and redesigned transaction confirmation surfaces.
 *
 * Coverage status vs. the extension spec is tracked in `./README.md`. The
 * Wagmi connector variant is intentionally deferred — its dapp interactions
 * differ but the underlying provider path is identical to Legacy EVM.
 */
import { SmokeMultiChainAPI } from '../../../tags';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { DEFAULT_ANVIL_PORT } from '../../../seeder/anvil-manager';
import MMConnectBrowserPlaygroundDapp from '../../../page-objects/Browser/MMConnectBrowserPlaygroundDapp';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import SigningBottomSheet from '../../../page-objects/Browser/SigningBottomSheet';
import ConfirmationUITypes from '../../../page-objects/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import Assertions from '../../../framework/Assertions';
import Browser from '../../../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector';
import NetworkNonPemittedBottomSheet from '../../../page-objects/Network/NetworkNonPemittedBottomSheet';
import { CustomNetworks } from '../../../resources/networks.e2e';
import { CUSTOM_RPC_PROVIDER_MOCKS } from '../../../api-mocking/mock-responses/custom-rpc-provider-mocks';

// Anvil's default chain id in hex (1337 → 0x539). Used to keep the wallet on
// the local node so `eth_sendTransaction` resolves against a funded account
// instead of hitting Infura/mainnet.
const ANVIL_CHAIN_ID_HEX = '0x539';

// Elysium Testnet (chainId 1338 → 0x53a) — the secondary chain we add to
// the dapp's permitted set so we can swap the active chain out from under
// it without touching Infura. Matches
// `tests/resources/networks.e2e.js` `CustomNetworks.ElysiumTestnet`.
const ELYSIUM_TESTNET_CHAIN_ID_HEX = '0x53a';

describe(SmokeMultiChainAPI('MMConnect Legacy EVM (in-app browser)'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('completes personal_sign successfully', async () => {
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

  it('restores the Legacy EVM session after a page refresh', async () => {
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
          // Establish the session.
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();

          // Soft refresh the in-app browser tab. The dapp re-mounts and
          // MMConnect's legacy provider should re-hydrate the session from
          // its persisted storage adapter without prompting the wallet.
          await MMConnectBrowserPlaygroundDapp.reloadDapp();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();

          // The session is still usable: `personal_sign` works end-to-end
          // without the dapp asking us to connect again.
          await MMConnectBrowserPlaygroundDapp.tapLegacyPersonalSign();
          await SigningBottomSheet.tapSignButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmResponseContains(
            '0x',
          );
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('notifies the dapp when the wallet changes the permitted chain', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.BROWSER_PLAYGROUND,
          },
        ],
        // Pre-seed Elysium Testnet so it shows up in the permissions editor.
        // We don't make the wallet's globally-active network change; instead
        // we add Elysium to the dapp's per-origin permitted set and then
        // remove Mainnet, which fires `chainChanged` to the dapp.
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.ElysiumTestnet.providerConfig)
          .build(),
        restartDevice: true,
        testSpecificMock: CUSTOM_RPC_PROVIDER_MOCKS,
      },
      async () => {
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        // Establish the legacy session on Mainnet (default active chain).
        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmChainIdContains(
            '0x1',
          );
        } finally {
          await device.enableSynchronization();
        }

        // Step 1: add Elysium Testnet to the dapp's permitted set. The
        // dapp's active chain stays on Mainnet because Mainnet is still
        // in the set, so no `chainChanged` is expected yet.
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkNonPemittedBottomSheet.tapElysiumTestnetNetworkName();
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Step 2: remove Mainnet from the dapp's permitted set. Only
        // Elysium Testnet remains, so the wallet must rotate the dapp's
        // active chain to Elysium and emit `chainChanged(0x53a)`.
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
        await NetworkConnectMultiSelector.selectNetworkChainPermission(
          'Ethereum Main Network',
        );
        await NetworkConnectMultiSelector.tapUpdateButton();

        // Assert the dapp observed the wallet-side chain switch.
        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmChainIdContains(
            ELYSIUM_TESTNET_CHAIN_ID_HEX,
          );
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('disconnects the dapp when the wallet revokes all permissions', async () => {
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

        // Establish a legacy session so there is something to revoke.
        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();
        } finally {
          await device.enableSynchronization();
        }

        // Wallet-side revoke: open the dapp's connection bar → Manage
        // permissions → Disconnect all accounts and networks → Confirm.
        // This mirrors the canonical revoke flow used by
        // `tests/regression/multichain/permissions/accounts/permission-system-revoke-multiple.spec.ts`.
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        // The MMConnect legacy provider should observe the wallet's
        // `accountsChanged: []` / permission removal and tear the
        // Legacy EVM card down without the dapp tapping Disconnect.
        await device.disableSynchronization();
        try {
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardNotVisible();
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });

  it('completes eth_sendTransaction successfully', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.BROWSER_PLAYGROUND,
          },
        ],
        // The dapp's "Send Transaction" button submits an `eth_sendTransaction`
        // against whatever chain MetaMask is connected to. Point the wallet at
        // the locally-spun-up Anvil node so the from-account (account #0 of
        // Anvil's mnemonic, which matches the default fixture SRP) is funded.
        fixture: new FixtureBuilder()
          .withNetworkController({
            chainId: ANVIL_CHAIN_ID_HEX,
            rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
            type: 'custom',
            nickname: 'Local RPC',
            ticker: 'ETH',
          })
          .withNetworkEnabledMap({
            eip155: { [ANVIL_CHAIN_ID_HEX]: true },
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        await device.disableSynchronization();
        try {
          // Connect on the Anvil chain. The single permitted scope (eip155:1337)
          // is what the dapp's legacy provider will use for the subsequent
          // `eth_sendTransaction`.
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();

          // Tap "Send Transaction" → MetaMask's redesigned transaction
          // confirmation modal opens. The default tx is a 0-value self-send
          // (from = to = active account) so it always passes simulation.
          await MMConnectBrowserPlaygroundDapp.tapLegacySendTransaction();
          await Assertions.expectElementToBeVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
            {
              description:
                'eth_sendTransaction confirmation modal should be visible',
              timeout: 30000,
            },
          );

          // Confirm → Anvil mines the tx → dapp receives the tx hash and
          // writes it into the legacy-evm-response-text element.
          await FooterActions.tapConfirmButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmResponseContains(
            '0x',
          );
        } finally {
          await device.enableSynchronization();
        }
      },
    );
  });
});
