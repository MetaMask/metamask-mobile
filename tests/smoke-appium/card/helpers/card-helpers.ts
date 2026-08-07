import Assertions from '../../../framework/Assertions.js';
import Gestures from '../../../framework/Gestures.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { CustomNetworks } from '../../../resources/networks.e2e.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import CardHomeView from '../../../page-objects/Card/CardHomeView.js';
import CardAuthenticationView from '../../../page-objects/Card/CardAuthenticationView.js';

export const CARD_E2E_EMAIL = 'card.e2e@metamask.io';
export const CARD_E2E_PASSWORD = 'CardE2ePassword1!';

/**
 * Standard Card smoke fixture: Linea + USDC + unauthenticated cardholder.
 * Authenticated sessions are established via mocked Baanx login UI.
 */
export function buildCardHomeFixture() {
  return new FixtureBuilder()
    .withMetaMetricsOptIn()
    .withNetworkController(CustomNetworks.Tenderly.Linea.providerConfig)
    .withAccountTreeController()
    .withTokens(
      [
        {
          address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
          decimals: 18,
          symbol: 'USDC',
          chainId: '0xe708',
          name: 'USDCoin',
        },
      ],
      '0xe708',
    )
    .withCardController()
    .build();
}

export async function loginAndOpenCardHome(): Promise<void> {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await Assertions.expectElementToBeVisible(WalletView.navbarCardButton);
  await WalletView.tapNavbarCardButton();
  await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle);
}

/**
 * From teaser Card Home, opens Auth via Change Asset and completes mocked login.
 * Leaves the app on authenticated Card Home with manage options loaded.
 */
export async function loginToCardViaChangeAsset(): Promise<void> {
  await CardHomeView.tapChangeAssetButton();
  await Assertions.expectElementToBeVisible(CardAuthenticationView.emailField, {
    elemDescription: 'Card Auth Email Field',
  });
  await CardAuthenticationView.login(CARD_E2E_EMAIL, CARD_E2E_PASSWORD);
  await Assertions.expectElementToBeVisible(CardHomeView.cardViewTitle, {
    elemDescription: 'Authenticated Card Home after login',
  });
  // Manage rows are gated on authenticated card + priority balance.
  await Assertions.expectElementToBeVisible(CardHomeView.changeAssetButton, {
    elemDescription: 'Change Asset after authenticated home load',
  });
  await Gestures.scrollToElement(CardHomeView.manageSpendingLimitItem);
  await Assertions.expectElementToBeVisible(
    CardHomeView.manageSpendingLimitItem,
    {
      elemDescription: 'Manage Spending Limit after authenticated home load',
    },
  );
}

export async function pressDeviceBack(): Promise<void> {
  if (!globalThis.driver) {
    throw new Error('WebDriver session not available for device back');
  }
  await globalThis.driver.back();
}
