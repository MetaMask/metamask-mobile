/**
 * E2E tests for MMConnect Legacy EVM (@metamask/connect-evm) driven inside
 * MetaMask Mobile's in-app browser via Detox (ported from the extension spec
 * `metamask-extension/test/e2e/tests/mm-connect/connect-evm.spec.ts`; the
 * perf-suite tests under `tests/performance/mm-connect/` instead drive an
 * external browser over Appium). EIP-1193 calls route via the in-app
 * `window.ethereum` bridge to `ConnectBottomSheet` and the redesigned
 * confirmation surfaces (shared footer). The Wagmi connector variant is
 * deferred — its provider path is identical to Legacy EVM.
 */
import type { Mockttp } from 'mockttp';
import { SmokeMultiChainAPI } from '../../../tags';
import { DappVariants } from '../../../framework/Constants';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { AnvilPort } from '../../../framework/fixtures/FixtureUtils';
import { LocalNode, LocalNodeType } from '../../../framework/types';
import { AnvilManager } from '../../../seeder/anvil-manager';
import MMConnectBrowserPlaygroundDapp from '../../../page-objects/Browser/MMConnectBrowserPlaygroundDapp';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import ConfirmationUITypes from '../../../page-objects/Browser/Confirmations/ConfirmationUITypes';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import Assertions from '../../../framework/Assertions';
import Browser from '../../../page-objects/Browser/BrowserView';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import {
  SECURITY_ALERTS_BENIGN_RESPONSE,
  securityAlertsUrl,
} from '../../../api-mocking/mock-responses/security-alerts-mock';

// Mainnet in hex. MMConnect's legacy provider always connects on eip155:1:
// the dapp's `LegacyEVMSDKProvider` requests chainId `0x1` by default and
// `@metamask/connect-evm` pins the active chain to the first permitted scope.
const MAINNET_CHAIN_ID_HEX = '0x1';

// Localhost (Anvil) chain — the e2e default per-dapp network the connect-evm
// card reports right after connecting with the default fixture.
const LOCALHOST_CHAIN_ID_HEX = '0x539';

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

        // BrowserTab + WebView + ConnectBottomSheet + confirmation footer
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
          //    received a 0x... signature. personal_sign uses the redesigned
          //    confirmation surface, so confirm via the shared footer.
          await MMConnectBrowserPlaygroundDapp.tapLegacyPersonalSign();
          await FooterActions.tapConfirmButton();
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

  // NOTE ON WALLET-SIDE `chainChanged`: the extension spec's "wallet changes
  // the permitted chain" scenario is not reproducible from the mobile UI for a
  // *connected* dapp — no surface calls `setNetworkClientIdForDomain` there
  // (the connected-accounts picker switches the *global* network; the
  // toolbar's per-dapp selector only renders while disconnected). We cover the
  // `chainChanged` delivery path via a dapp-initiated
  // `wallet_switchEthereumChain` instead, which does update the per-dapp
  // network and emits `metamask_chainChanged` to the provider.
  it('notifies the dapp when it switches the active chain', async () => {
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
          // Establish the legacy session. The e2e default per-dapp network is
          // Localhost `0x539`, so the card's chain-id readout starts there.
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmChainIdContains(
            LOCALHOST_CHAIN_ID_HEX,
          );

          // Dapp-initiated `wallet_switchEthereumChain` to Mainnet (`0x1`,
          // already permitted since connect-evm requests `eip155:1` on connect).
          await MMConnectBrowserPlaygroundDapp.tapLegacySwitchToMainnet();

          // The connect-evm provider observes `metamask_chainChanged(0x1)` and
          // re-renders the card's chain-id readout.
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmChainIdContains(
            MAINNET_CHAIN_ID_HEX,
          );

          // The readout above is client-side. Follow up with a `personal_sign`
          // to prove the switch actually reached the wallet: the request must
          // still round-trip through the (now Mainnet) per-dapp session and
          // produce a signature via the redesigned confirmation footer.
          await MMConnectBrowserPlaygroundDapp.tapLegacyPersonalSign();
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

        // Wallet-side revoke: open the dapp's connection bar → Disconnect all
        // accounts and networks → Confirm. The connected-accounts summary
        // bottom sheet surfaces "Disconnect all"
        // (DISCONNECT_ALL_ACCOUNTS_NETWORKS) directly, so there is no
        // intermediate "Manage permissions" step.
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
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
        // MMConnect's legacy provider always connects on eip155:1 (mainnet), so
        // the dapp's `eth_sendTransaction` is a mainnet transaction regardless
        // of the wallet's globally-selected network. Back mainnet with a local
        // Anvil node started as chainId 1 so the tx submits against a funded
        // account (Anvil account #0 == the default fixture SRP) and returns a
        // real tx hash to the dapp — instead of hanging on live/mocked Infura.
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: { chainId: 1 },
          },
        ],
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort = node?.getPort?.() ?? AnvilPort();
          return new FixtureBuilder()
            .withNetworkController({
              chainId: MAINNET_CHAIN_ID_HEX,
              rpcUrl: `http://localhost:${rpcPort}`,
              type: 'custom',
              nickname: 'Ethereum Mainnet',
              ticker: 'ETH',
            })
            .build();
        },
        restartDevice: true,
        // The dapp's "Send Transaction" targets the zero address, which Blockaid
        // flags — turning the confirmation footer into "Review alert" instead of
        // "Confirm". Mock a benign security-alerts response so the tx can be
        // confirmed and submitted.
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'POST',
            url: securityAlertsUrl(MAINNET_CHAIN_ID_HEX),
            response: SECURITY_ALERTS_BENIGN_RESPONSE,
            responseCode: 201,
          });
        },
      },
      async () => {
        await MMConnectBrowserPlaygroundDapp.setupAndNavigateToTestDapp();

        await device.disableSynchronization();
        try {
          // Connect on mainnet (the legacy provider's default active chain,
          // now backed by the local Anvil node).
          await MMConnectBrowserPlaygroundDapp.tapConnectLegacy();
          await ConnectBottomSheet.tapConnectButton();
          await MMConnectBrowserPlaygroundDapp.assertLegacyEvmCardVisible();

          // Tap "Send Transaction" → MetaMask's redesigned transaction
          // confirmation modal opens.
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
