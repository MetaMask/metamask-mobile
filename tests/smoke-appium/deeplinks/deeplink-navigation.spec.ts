import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { SmokeWalletPlatform } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';
import DeeplinkModal from '../../page-objects/swaps/Deeplink.js';
import NetworkListModal from '../../page-objects/Network/NetworkListModal.js';
import { testSpecificMock } from '../../helpers/swap/swap-mocks.js';
import { openE2EUrl } from '../../framework/DeepLink.js';

// Swap 1 USDC → ETH on Ethereum mainnet (1000000 = 1 USDC in atomic units)
// Address must be checksummed to match the mock server URL pattern
const SWAP_DEEPLINK =
  'metamask://swap?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/slip44:60&amount=1000000';
// Send 3 ETH to zero address on mainnet (chainId=1, value in wei)
const SEND_DEEPLINK =
  'metamask://send/0x0000000000000000000000000000000000000000@1?value=3e18';
// Navigate home and auto-open the network selector
const HOME_DEEPLINK = 'metamask://home?openNetworkSelector=true';
const NFT_DEEPLINK = 'metamask://nft';

appiumTest.describe(SmokeWalletPlatform('Deeplink Navigation'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'opens various screens via deeplinks with correct parameters',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          // Verify swap deeplink pre-fills USDC as source token
          await openE2EUrl(SWAP_DEEPLINK);
          await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
            timeout: 20000,
            description: 'Swap quote view opens after swap deeplink',
          });
          await Assertions.expectTextDisplayed('USDC', {
            timeout: 10000,
            description: 'Source token USDC is pre-filled from deeplink params',
          });

          // Verify send deeplink shows correct amount
          await openE2EUrl(SEND_DEEPLINK);
          await DeeplinkModal.tapContinue();
          await Assertions.expectTextDisplayed('Sending', {
            timeout: 20000,
            description: 'Send confirmation view opens after send deeplink',
          });
          await Assertions.expectTextDisplayed('3 ETH', {
            timeout: 10000,
            description: 'Send amount 3 ETH matches deeplink value param',
          });

          // Verify home deeplink opens wallet with network selector
          await openE2EUrl(HOME_DEEPLINK);
          await DeeplinkModal.tapContinue();
          await Assertions.expectElementToBeVisible(
            NetworkListModal.selectNetwork,
            {
              timeout: 20000,
              description:
                'Network selector opens from home deeplink openNetworkSelector param',
            },
          );

          // Verify NFT deeplink
          await openE2EUrl(NFT_DEEPLINK);
          await DeeplinkModal.tapContinue();
          await Assertions.expectTextDisplayed('NFTs', {
            timeout: 20000,
            description: 'NFT full view opens after nft deeplink',
          });
        },
      );
    },
  );
});
