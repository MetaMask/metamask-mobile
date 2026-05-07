import { test } from '../../framework/fixture';

import { loginToAppPlaywright } from '../../flows/wallet.flow';
import RNPlaygroundDapp from '../../page-objects/MMConnect/RNPlaygroundDapp';
import DappConnectionModal from '../../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../../page-objects/MMConnect/SignModal';
import { unlockIfLockScreenVisible, ensurePlaygroundInstalled } from './utils';
import { sleep } from '../../framework';

/**
 * After a MetaMask action (approve / sign / cancel), wait for the callback
 * deeplink to return to the playground. Falls back to activateApp if the
 * automatic return does not happen within a short window.
 */
async function returnToPlayground() {
  await sleep(2000);
  await RNPlaygroundDapp.ensureInPlayground();
}

test('@metamask/connect-legacy-evm-rn - Connect via Legacy EVM, sign, send transaction, and switch chains', async ({
  currentDeviceDetails,
  driver,
}) => {
  // When running on BrowserStack we skip the test if the RN playground is not installed
  test.skip(
    currentDeviceDetails.isBrowserstack &&
      !process.env.BROWSERSTACK_RN_PLAYGROUND_URL,
    'Skipped: BROWSERSTACK_RN_PLAYGROUND_URL is not set',
  );

  // handle local installs of the RN playground
  if (!currentDeviceDetails.isBrowserstack) {
    ensurePlaygroundInstalled(currentDeviceDetails);
  }

  //
  // 1. Login to MetaMask wallet
  //
  await loginToAppPlaywright();

  //
  // 2. Switch to the RN playground and connect via Legacy EVM
  //
  await RNPlaygroundDapp.switchToPlayground();
  await RNPlaygroundDapp.waitForPlaygroundReady();

  await RNPlaygroundDapp.tapConnectLegacy();
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(5000);
  await DappConnectionModal.tapConnectButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });

  //
  // 3. Verify accountsChanged — Legacy EVM card visible with accounts
  //

  await returnToPlayground();
  await sleep(2000);

  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.appTitle, {
    scrollParams: { direction: 'down' },
  });
  await RNPlaygroundDapp.scrollToElement(RNPlaygroundDapp.legacyEvmCard);
  await RNPlaygroundDapp.assertLegacyEvmConnected();
  await RNPlaygroundDapp.assertLegacyEvmHasAccounts();
  await RNPlaygroundDapp.assertLegacyEvmActiveAccount();

  const initialChainId = await RNPlaygroundDapp.getLegacyEvmChainId();
  console.log(`Initial chain ID: ${initialChainId}`);

  //
  // 4. personal_sign — request, approve, verify result
  //
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnPersonalSign,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnPersonalSign,
  );
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(1000);
  await SignModal.tapConfirmButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });

  await returnToPlayground();
  await sleep(1000);

  // Verify signature was returned (hex string starting with 0x)
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmResponseText,
  );
  const signResponse = await RNPlaygroundDapp.getLegacyEvmResponseText();
  console.log(`personal_sign response: ${signResponse}`);
  console.log(`personal_sign contains 0x: ${signResponse.includes('0x')}`);

  //
  // 5. eth_sendTransaction — request, cancel (to avoid spending funds)
  //
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnSendTransaction,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnSendTransaction,
  );
  await sleep(3000);

  await unlockIfLockScreenVisible();
  await sleep(1000);

  // Cancel the transaction to avoid spending real funds
  await SignModal.tapCancelButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });

  await returnToPlayground();
  await sleep(1000);

  // The dapp should show an error (user rejected) in the response

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmResponseText,
    {
      scrollParams: { direction: 'down' },
      percent: 0.5,
    },
  );

  const txResponse = await RNPlaygroundDapp.getLegacyEvmResponseText();
  console.log(`eth_sendTransaction (cancelled) response: ${txResponse}`);
  console.log(
    `eth_sendTransaction contains denied: ${txResponse.toLowerCase().includes('denied')}`,
  );

  //
  // 6. Chain switching from the dapp — wallet_switchEthereumChain
  //    Switch to Polygon from the dapp, verify the chain ID updates.
  //

  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
  );
  await RNPlaygroundDapp.tapLegacyEvmButton(
    RNPlaygroundDapp.legacyEvmBtnSwitchPolygon,
  );
  await sleep(3000);

  // The switch opens MetaMask with a network approval dialog.
  // The SwitchChainApproval dialog uses "connect-button" as its confirm testID.
  await unlockIfLockScreenVisible();
  await sleep(1000);
  await DappConnectionModal.tapConnectButton({
    shouldCooldown: true,
    timeToCooldown: 3000,
  });

  await returnToPlayground();
  await sleep(2000);

  // Verify chain ID updated to Polygon (0x89)
  await RNPlaygroundDapp.scrollToElement(
    RNPlaygroundDapp.legacyEvmChainIdValue,
    { scrollParams: { direction: 'down' } },
  );
  const polygonChainId = await RNPlaygroundDapp.getLegacyEvmChainId();
  console.log(`Chain ID after dapp switch to Polygon: ${polygonChainId}`);
  console.log(`Chain ID contains 0x89: ${polygonChainId.includes('0x89')}`);
});
