import enContent from '../../../locales/languages/en.json';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import type { AppiumElement } from '../../framework/AppiumElement';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';
import Browser from './BrowserView';
import { Assertions, TapOptions, Utilities, sleep } from '../../framework';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers';
import { createAppiumLogger } from '../../framework/appiumLogger';

const logger = createAppiumLogger('TestDApp');

const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;
const CONNECT_BUTTON_TEXT = 'Connect';
const DAPP_ACCOUNTS_TEXT = 'Accounts:';

interface ContractNavigationParams {
  contractAddress: string;
  scrollTo?: string;
}

const testDappPageUrl = (): string => getDappUrl(0);

const getTestDappWebElementById = (innerID: string): Promise<AppiumElement> =>
  Matchers.getElementByWebID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    innerID,
    testDappPageUrl(),
  );

const getTestDappWebElementByXPath = (xpath: string): Promise<AppiumElement> =>
  Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
    testDappPageUrl(),
  );

class TestDApp {
  get confirmButtonText(): Promise<AppiumElement> {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get approveButtonText(): Promise<AppiumElement> {
    return Matchers.getElementByText(APPROVE_BUTTON_TEXT);
  }

  get DappConnectButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.CONNECT_BUTTON);
  }

  get connectedAccounts(): Promise<AppiumElement> {
    return getTestDappWebElementByXPath(
      `//*[contains(text(),"${DAPP_ACCOUNTS_TEXT}")]`,
    );
  }

  get ApproveERC20TokensButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.APPROVE_ERC_20_TOKENS_BUTTON_ID,
    );
  }

  get ApproveERC721TokenButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.APPROVE_ERC_721_TOKEN_BUTTON_ID,
    );
  }

  get invalidSignature(): Promise<AppiumElement> {
    return getTestDappWebElementById('signInvalidType');
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }

  get increaseAllowanceButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.INCREASE_ALLOWANCE_BUTTON_ID,
    );
  }

  get personalSignButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.PERSONAL_SIGN);
  }

  get signTypedDataButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA);
  }

  get signTypedDataV3Button(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3);
  }

  get signTypedDataV4Button(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4);
  }

  get ethereumSignButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.ETHEREUM_SIGN);
  }

  get permitSignButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.PERMIT_SIGN);
  }

  get siweBadDomainButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ETHEREUM_SIGN_BAD_DOMAIN,
    );
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get nftTransferFromTokensButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID,
    );
  }

  get nftSetApprovalForAllButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_NFT_BUTTON_ID,
    );
  }

  get addTokensToWalletButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ADD_TOKENS_TO_WALLET_BUTTON,
    );
  }

  get erc1155SetApprovalForAllButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_ERC1155_BUTTON_ID,
    );
  }

  get sendFailingTransactionButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SEND_FAILING_TRANSACTION_BUTTON_ID,
    );
  }

  get erc1155BatchTransferButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.BATCH_TRANSFER_ERC1155_BUTTON_ID,
    );
  }

  get switchChainFromTestDappButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
    );
  }

  get testDappFoxLogo(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }

  get testDappPageTitle(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  get erc721MintButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_721_MINT_BUTTON_ID,
    );
  }

  get sendEIP1559Button(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    );
  }

  get deployContractButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.DEPLOY_CONTRACT_BUTTON_ID,
    );
  }

  get sendCallsButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SEND_CALLS_BUTTON);
  }

  get revokeAccountPermission(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.REVOKE_ACCOUNTS_PERMISSIONS,
    );
  }

  get connectButtonText(): Promise<AppiumElement> {
    return Matchers.getElementByText(CONNECT_BUTTON_TEXT);
  }

  get erc721RevokeApprovalButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_721_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get erc1155RevokeApprovalButton(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_1155_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get openNetworkPicker(): Promise<AppiumElement> {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER,
    );
  }

  get networkModalContent(): Promise<AppiumElement> {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '.network-modal-content',
      testDappPageUrl(),
    );
  }

  getNetworkItemByName(
    networkName: string,
    { exactMatch = false }: { exactMatch?: boolean } = {},
  ): Promise<AppiumElement> {
    const textPredicate = exactMatch
      ? `text()="${networkName}"`
      : `contains(text(), "${networkName}")`;
    return getTestDappWebElementByXPath(
      `//div[contains(@class, "network-modal-item-name") and ${textPredicate}]`,
    );
  }

  get networkModalBody(): Promise<AppiumElement> {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '.network-modal-body',
      testDappPageUrl(),
    );
  }

  async verifyCurrentNetworkText(expectedNetworkName: string): Promise<void> {
    const expectedText = `Current Network: ${expectedNetworkName}`;

    await Assertions.expectElementToContainText(
      this.openNetworkPicker,
      expectedText,
      {
        description: `current network should contain "${expectedText}"`,
      },
    );
  }

  async getNetworkCellByLabel(networkLabel: string): Promise<AppiumElement> {
    // Try different indices to find the network with the matching label
    for (let index = 0; index < 10; index++) {
      try {
        const networkCell = await Matchers.getElementByIDAndLabel(
          'cellmultiselect',
          networkLabel,
          index,
        );
        await Assertions.expectElementToBeVisible(networkCell, {
          timeout: 1000,
        });
        return networkCell;
      } catch {
        // Continue to next index
      }
    }
    throw new Error(`Could not find network cell with label "${networkLabel}"`);
  }

  /**
   * Checks if the user is connected to the test dapp by checking if there are connected accounts
   * @returns true if connected, false otherwise
   */
  async isConnectedToTestDapp(): Promise<boolean> {
    return Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(this.connectedAccounts);
        const accountsText = text.replace(DAPP_ACCOUNTS_TEXT, '').trim();
        if (accountsText.length > 0) {
          return true;
        }
        throw new Error('Not connected to test dapp');
      },
      {
        timeout: 30000,
        description: 'Check if connected to test dapp',
      },
    );
  }

  async getConnectedAccounts(): Promise<string> {
    return this.readTestDappTextContentById(
      TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
    );
  }

  async getConnectedChainId(): Promise<string> {
    return this.readTestDappTextContentById(
      TestDappSelectorsWebIDs.CHAIN_ID_TEXT,
    );
  }

  /**
   * Wait until the test-dapp element has non-empty textContent.
   * Polls via ChromeCdpHelpers (CDP on Android, WebView execute on iOS).
   */
  private async readTestDappTextContentById(webId: string): Promise<string> {
    return Utilities.executeWithRetry(
      async () => {
        const text =
          (await ChromeCdpHelpers.evaluateInWebView<string>(
            testDappPageUrl(),
            `(document.getElementById(${JSON.stringify(
              webId,
            )})?.textContent || '').trim()`,
          )) ?? '';
        if (!text) {
          throw new Error(
            `Test dapp #${webId} text is empty (provider may not have injected yet)`,
          );
        }
        return text;
      },
      {
        timeout: 30000,
        description: `Poll test dapp #${webId} textContent via JS`,
      },
    );
  }

  async connect(): Promise<void> {
    await Gestures.waitAndTap(this.DappConnectButton, {
      elemDescription: 'Dapp connect button',
    });
  }

  async tapApproveERC20TokensButton(): Promise<void> {
    await Gestures.waitAndTap(this.ApproveERC20TokensButton, {
      elemDescription: 'Approve ERC20 tokens button',
    });
  }

  async tapApproveERC721TokenButton(): Promise<void> {
    await Gestures.waitAndTap(this.ApproveERC721TokenButton, {
      elemDescription: 'Approve ERC721 token button',
    });
  }

  async tapInvalidSigButton(): Promise<void> {
    await Gestures.waitAndTap(this.invalidSignature, {
      elemDescription: 'Invalid signature button',
    });
  }

  async tapIncreaseAllowanceButton(): Promise<void> {
    await Gestures.waitAndTap(this.increaseAllowanceButton, {
      elemDescription: 'Increase allowance button',
    });
  }

  async tapAddERC20TokenToWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.addTokensToWalletButton, {
      elemDescription: 'Add ERC20 token to wallet button',
    });
  }

  async tapPersonalSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.personalSignButton, {
      elemDescription: 'Personal sign button',
    });
  }

  async tapTypedSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataButton, {
      elemDescription: 'Typed sign button',
    });
  }

  async tapTypedV3SignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV3Button, {
      elemDescription: 'Typed V3 sign button',
    });
  }

  async tapTypedV4SignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV4Button, {
      elemDescription: 'Typed V4 sign button',
    });
  }

  async tapEthereumSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumSignButton, {
      elemDescription: 'Ethereum sign button',
    });
  }

  async tapPermitSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.permitSignButton, {
      elemDescription: 'Permit sign button',
    });
  }

  async tapSIWEBadDomainButton(): Promise<void> {
    await Gestures.waitAndTap(this.siweBadDomainButton, {
      elemDescription: 'SIWE bad domain button',
    });
  }

  async tapERC20TransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc20TransferTokensButton, {
      elemDescription: 'ERC20 transfer button',
    });
  }

  async tapNFTTransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.nftTransferFromTokensButton, {
      elemDescription: 'NFT transfer button',
    });
  }

  async tapERC721MintButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc721MintButton, {
      elemDescription: 'ERC721 mint button',
    });
  }

  async tapNFTSetApprovalForAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.nftSetApprovalForAllButton, {
      elemDescription: 'NFT set approval for all button',
    });
  }

  async tapERC1155SetApprovalForAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc1155SetApprovalForAllButton, {
      elemDescription: 'ERC1155 set approval for all button',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonText, {
      elemDescription: 'Confirm Button',
    });
  }

  async tapConfirmButtonToDisappear(): Promise<void> {
    await Gestures.tap(this.confirmButtonText, {
      elemDescription: 'Confirm Button',
      waitForElementToDisappear: true,
    });
  }

  async tapConnectButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectButtonText, {
      elemDescription: 'Connect Button',
    });
  }

  async tapSwitchChainButton(timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        testDappPageUrl(),
        TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
      );
      if (clicked) return;
      await sleep(300);
    }
    throw new Error(
      `Timed out waiting for #${TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN} in TestDApp WebView`,
    );
  }

  /**
   * Clicks the Test Dapp `#connectButton` in the WebView (eth_requestAccounts).
   * Retries until the connect sheet appears — needed on slow Appium Android loads.
   */
  async tapDappConnectButton(timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastClickAt = 0;
    let clickAttempts = 0;
    let lastClickResult: boolean | null = null;

    while (Date.now() < deadline) {
      if (Date.now() - lastClickAt >= 1_000) {
        lastClickAt = Date.now();
        clickAttempts += 1;
        lastClickResult = await ChromeCdpHelpers.evaluateInWebView<boolean>(
          testDappPageUrl(),
          `(() => {
            const el = document.getElementById(${JSON.stringify(
              TestDappSelectorsWebIDs.CONNECT_BUTTON,
            )});
            if (!el) return false;
            el.click();
            return true;
          })()`,
        );
        logger.info(
          `tapDappConnectButton attempt=${clickAttempts} cdpClick=${String(lastClickResult)} url=${testDappPageUrl()}`,
        );
      }

      try {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(
            ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
          ),
          { timeout: 500 },
        );
        logger.info(
          `tapDappConnectButton connect sheet visible after ${clickAttempts} click attempt(s)`,
        );
        return;
      } catch {
        // Connect sheet not up yet.
      }

      await sleep(300);
    }

    const diagnostics = await ChromeCdpHelpers.evaluateInWebView<{
      href: string;
      hasConnectButton: boolean;
      hasEthereum: boolean;
      hasProviders: boolean;
      chainId: string | null;
      accountsText: string | null;
      selectedAddress: string | null;
    }>(
      testDappPageUrl(),
      `(() => {
        const connectEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.CONNECT_BUTTON,
        )});
        const accountsEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
        )});
        const chainEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.CHAIN_ID_TEXT,
        )});
        return {
          href: location.href,
          hasConnectButton: Boolean(connectEl),
          hasEthereum: typeof window.ethereum !== 'undefined',
          hasProviders: Array.isArray(window.ethereum?.providers)
            ? window.ethereum.providers.length > 0
            : Boolean(window.ethereum),
          chainId: chainEl ? (chainEl.textContent || null) : null,
          accountsText: accountsEl ? (accountsEl.textContent || null) : null,
          selectedAddress: window.ethereum?.selectedAddress ?? null };
      })()`,
    );

    logger.error(
      `tapDappConnectButton timed out after ${clickAttempts} click attempt(s); lastClick=${String(lastClickResult)}; diagnostics=${JSON.stringify(diagnostics)}`,
    );

    throw new Error(
      `Timed out waiting for connect sheet after #${TestDappSelectorsWebIDs.CONNECT_BUTTON} click` +
        ` (attempts=${clickAttempts}, lastClick=${String(lastClickResult)}, diagnostics=${JSON.stringify(diagnostics)})`,
    );
  }

  async requestPermissions({
    accounts,
  }: { accounts?: string[] } = {}): Promise<void> {
    const request = JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_requestPermissions',
      params: [
        {
          eth_accounts: accounts
            ? {
                caveats: [
                  { type: 'restrictReturnedAccounts', value: accounts },
                ],
              }
            : {},
        },
      ],
    });
    await ChromeCdpHelpers.evaluateInWebView(
      testDappPageUrl(),
      `window.ethereum.request(${request})`,
    );
  }

  async tapApproveButton(): Promise<void> {
    await Gestures.waitAndTap(this.approveButtonText, {
      elemDescription: 'Approve Button',
    });
  }

  async tapSendFailingTransactionButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendFailingTransactionButton, {
      elemDescription: 'Send failing transaction button',
    });
  }

  async tapERC1155BatchTransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc1155BatchTransferButton, {
      elemDescription: 'ERC1155 batch transfer button',
    });
  }

  async tapButton(
    elementId: Promise<AppiumElement>,
    options: TapOptions = {},
  ): Promise<void> {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tap(elementId, options);
  }

  async navigateToTestDappWithContract({
    contractAddress,
    scrollTo,
  }: ContractNavigationParams): Promise<void> {
    await Browser.tapUrlInputBox();
    const params = new URLSearchParams({ contract: contractAddress });
    if (scrollTo) {
      params.set('scrollTo', scrollTo);
    }
    await Browser.navigateToURL(`${getDappUrl(0)}/?${params.toString()}`);
  }

  async switchChainFromTestDapp(): Promise<void> {
    await this.tapButton(this.switchChainFromTestDappButton, {
      elemDescription: 'Switch Chain from Test Dapp',
    });
  }

  async tapSendEIP1559Button(): Promise<void> {
    await this.tapButton(this.sendEIP1559Button, {
      elemDescription: 'Send EIP1559 Transaction Button',
    });
  }

  async tapDeployContractButton(): Promise<void> {
    await this.tapButton(this.deployContractButton, {
      elemDescription: 'Deploy Contract Button',
    });
  }

  async tapSendCallsButton(): Promise<void> {
    await this.tapButton(this.sendCallsButton, {
      elemDescription: 'Send Calls Button',
    });
  }

  async tapRevokeAccountPermission(): Promise<void> {
    await this.tapButton(this.revokeAccountPermission, {
      elemDescription: 'Revoke Account Permission Button',
    });
  }

  async tapERC721RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc721RevokeApprovalButton, {
      elemDescription: 'ERC721 Revoke Approval Button',
    });
  }

  async tapERC1155RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc1155RevokeApprovalButton, {
      elemDescription: 'ERC1155 Revoke Approval Button',
    });
  }

  async tapOpenNetworkPicker(): Promise<void> {
    // Prefer CDP / WebView DOM click — native UiAutomator scroll+tap on the
    // picker button is flaky under Android Appium (off-screen WebView nodes).
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      testDappPageUrl(),
      TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER,
    );
    if (clicked) {
      await Utilities.executeWithRetry(
        async () => {
          const open = await ChromeCdpHelpers.evaluateInWebView<boolean>(
            testDappPageUrl(),
            `(() => !!document.querySelector('.network-modal-body'))()`,
          );
          if (!open) {
            throw new Error('Test-dapp network picker modal not open yet');
          }
        },
        {
          timeout: 15000,
          description: 'Wait for test-dapp network picker modal',
        },
      );
      return;
    }

    await this.tapButton(this.openNetworkPicker, {
      elemDescription: 'Open Network Picker Button',
    });
  }

  async tapNetworkByName(
    networkName: string,
    { exactMatch = false }: { exactMatch?: boolean } = {},
  ): Promise<void> {
    // Residual flake after wait+maxScrolls bump: native getElementByText +
    // WebView page scrollIntoView does not target the modal list
    // (.network-modal-body / .network-modal-item-name). Click via CDP/DOM
    // instead — same approach as tapSwitchChainButton / tapDappConnectButton.
    const matchMode = exactMatch ? 'exact' : 'includes';
    await Utilities.executeWithRetry(
      async () => {
        const clicked = await ChromeCdpHelpers.evaluateInWebView<boolean>(
          testDappPageUrl(),
          `(() => {
            const items = Array.from(
              document.querySelectorAll('.network-modal-item-name'),
            );
            const target = ${JSON.stringify(networkName)};
            const exact = ${exactMatch ? 'true' : 'false'};
            const el = items.find((node) => {
              const text = (node.textContent || '').trim();
              return exact ? text === target : text.includes(target);
            });
            if (!el) return false;
            const row = el.closest('.network-modal-item') || el;
            if (typeof row.scrollIntoView === 'function') {
              row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            row.click();
            return true;
          })()`,
        );
        if (!clicked) {
          throw new Error(
            `Network option "${networkName}" (${matchMode}) not clickable in dapp picker modal`,
          );
        }
      },
      {
        timeout: 20000,
        description: `Tap network option "${networkName}" in dapp picker via CDP`,
      },
    );
  }
}

export default new TestDApp();
