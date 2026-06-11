import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeWalletPlatform } from '../../tags';
import Assertions from '../../framework/Assertions';
import QuoteView from '../../page-objects/swaps/QuoteView';
import DeeplinkModal from '../../page-objects/swaps/Deeplink';
import WalletView from '../../page-objects/wallet/WalletView';

const SWAP_DEEPLINK = 'metamask://swap';
const SEND_DEEPLINK =
  'metamask://send/0x0000000000000000000000000000000000000000@1?value=0';
const HOME_DEEPLINK = 'metamask://home';
const NFT_DEEPLINK = 'metamask://nft';

describe(SmokeWalletPlatform('Deeplink Navigation'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('opens various screens via deeplinks', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Verify swap deeplink
        await device.openURL({ url: SWAP_DEEPLINK });
        await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
          timeout: 20000,
          description: 'Swap quote view opens after swap deeplink',
        });

        // Verify send deeplink
        await device.openURL({ url: SEND_DEEPLINK });
        await DeeplinkModal.tapContinue();
        await Assertions.expectTextDisplayed('Sending', {
          timeout: 20000,
          description: 'Send confirmation view opens after send deeplink',
        });

        // Verify home deeplink
        await device.openURL({ url: HOME_DEEPLINK });
        await DeeplinkModal.tapContinue();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 20000,
          description: 'Wallet home opens after home deeplink',
        });

        // Verify NFT deeplink
        await device.openURL({ url: NFT_DEEPLINK });
        await DeeplinkModal.tapContinue();
        await Assertions.expectTextDisplayed('NFTs', {
          timeout: 20000,
          description: 'NFT full view opens after nft deeplink',
        });
      },
    );
  });
});
