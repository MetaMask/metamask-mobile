/**
 * WalletConnect v2 Chain Switching Test
 *
 * Tests wallet_switchEthereumChain flow:
 *   connect → read initial chainId → switch to Linea → approve → verify →
 *   switch back to Ethereum Mainnet → approve → verify → disconnect
 *
 * Prerequisites:
 * - Android emulator running with MetaMask installed and wallet set up
 * - E2E_PASSWORD set in .e2e.env
 * - APK path configured via APK_PATH env var or in appwright.config.ts
 * - Chrome installed on the emulator
 * - Linea network available in MetaMask (pre-configured by default)
 */

import { test, expect } from 'appwright';

import { launchMobileBrowser } from '../../utils/MobileBrowser.js';
import AppwrightHelpers from '../../../tests/framework/AppwrightHelpers.js';
import AppwrightGestures from '../../../tests/framework/AppwrightGestures.js';
import SwitchChainModal from '../../../wdio/screen-objects/Modals/SwitchChainModal.js';
import WalletConnectDapp from '../../../wdio/screen-objects/WalletConnectDapp.js';
import {
  connectWalletConnectSession,
  switchToMetaMask,
  WC_TEST_DAPP_URL,
} from './helpers.js';

const LINEA_CHAIN_ID = '0xe708';
const ETHEREUM_CHAIN_ID = '0x1';

/**
 * Open the network picker on the dapp, tap a network verify the chainId updated.
 */
async function switchChainFlow(device, { targetChainId, expectedChainId }) {
  // Open network picker and select target chain
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapOpenNetworkPicker();
      await AppwrightGestures.wait(2000);
      await WalletConnectDapp.tapNetworkItem(targetChainId);
    },
    WC_TEST_DAPP_URL,
  );

  // Wait for MetaMask to receive the switch request
  await AppwrightGestures.wait(2000);

  // Switch to MetaMask and approve the chain switch
  await AppwrightHelpers.withNativeAction(device, async () => {
    await switchToMetaMask(device);
  });

  // Switch back to browser and verify chainId updated
  await AppwrightGestures.wait(2000);
  await launchMobileBrowser(device);

  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      const chainId = await WalletConnectDapp.getChainId();
      expect(chainId).toBe(expectedChainId);
    },
    WC_TEST_DAPP_URL,
  );
}

test('WalletConnect v2 - switch Ethereum chain', async ({ device }) => {
  SwitchChainModal.device = device;

  // ── Connect ───────────────────────────────────────────────────────
  await connectWalletConnectSession(device);

  // ── Verify initial chain (Ethereum Mainnet) ───────────────────────
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      const chainId = await WalletConnectDapp.getChainId();
      expect(chainId).toBe(ETHEREUM_CHAIN_ID);
    },
    WC_TEST_DAPP_URL,
  );

  // ── Switch to Linea ───────────────────────────────────────────────
  await switchChainFlow(device, {
    targetChainId: LINEA_CHAIN_ID,
    expectedChainId: Number(LINEA_CHAIN_ID),
  });

  // ── Cleanup: Disconnect ───────────────────────────────────────────
  await AppwrightHelpers.withWebAction(
    device,
    async () => {
      await WalletConnectDapp.tapDisconnectButton();
      await AppwrightGestures.wait(2000);
      await WalletConnectDapp.assertDisconnected();
    },
    WC_TEST_DAPP_URL,
  );
});
