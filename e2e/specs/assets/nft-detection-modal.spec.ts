import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import NftDetectionModal from '../../pages/wallet/NftDetectionModal';
import { RegressionAssets } from '../../tags';

import { NftDetectionModalSelectorsText } from '../../selectors/wallet/NftDetectionModal.selectors';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/mockHelpers';

const nftApiMock = async (mockServer: Mockttp) => {
  // Mock NFT tokens endpoint
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/nft\.api\.cx\.metamask\.io\/users\/0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3\/tokens\?.*$/,
    responseCode: 200,
    response: {
      tokens: [
        {
          token: {
            chainId: 1,
            contract: '0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
            tokenId: '1',
            kind: 'erc721',
            name: 'Rarible NFT #1',
            image: 'https://lh3.googleusercontent.com/test-image.png',
            imageSmall:
              'https://lh3.googleusercontent.com/test-image-small.png',
            imageLarge:
              'https://lh3.googleusercontent.com/test-image-large.png',
            metadata: {
              imageOriginal:
                'ipfs://QmZt9qM8gLjuB3t5ZsixRywk2xp2qyB4JudefBGPeN6cJ5',
              imageMimeType: 'image/png',
              tokenURI: 'https://ipfs.io/ipfs/test-metadata',
            },
            description: 'A test Rarible NFT for E2E testing',
            rarityScore: null,
            rarityRank: null,
            supply: '1',
            remainingSupply: '1',
            media: null,
            isFlagged: false,
            isSpam: false,
            isNsfw: false,
            metadataDisabled: false,
            lastFlagUpdate: null,
            lastFlagChange: null,
            collection: {
              id: '0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
              name: 'Rarible',
              slug: 'rarible',
              symbol: 'RARI',
              contractDeployedAt: '2020-07-15T10:30:00.000Z',
              imageUrl:
                'https://lh3.googleusercontent.com/rarible-collection.png',
              isSpam: false,
              isNsfw: false,
              metadataDisabled: false,
              openseaVerificationStatus: 'verified',
              tokenCount: '10000',
              floorAsk: {
                id: null,
                price: null,
                maker: null,
                validFrom: null,
                validUntil: null,
                source: null,
              },
              royaltiesBps: 250,
              royalties: null,
            },
            lastSale: {
              orderSource: null,
              fillSource: null,
              timestamp: 1595000000,
              price: {
                currency: {
                  contract: '0x0000000000000000000000000000000000000000',
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                amount: {
                  raw: '1000000000000000000',
                  decimal: 1.0,
                  usd: 1815.41,
                  native: 1.0,
                },
              },
            },
            topBid: {
              id: null,
              price: null,
              source: null,
            },
            floorAsk: {
              id: null,
              price: null,
              maker: null,
              validFrom: null,
              validUntil: null,
              source: null,
            },
            lastAppraisalValue: null,
            attributes: [],
            isPhishingDetected: false,
          },
          ownership: {
            tokenCount: '1',
            onSaleCount: '0',
            floorAsk: {
              id: null,
              price: null,
              maker: null,
              kind: null,
              validFrom: null,
              validUntil: null,
              source: null,
            },
            acquiredAt: '2020-07-15T10:30:00.000Z',
          },
        },
      ],
      continuation: null,
    },
  });

  // Mock collections endpoint - returns collection information
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/nft\.api\.cx\.metamask\.io\/collections\?.*$/,
    responseCode: 200,
    response: {
      collections: [
        {
          chainId: 1,
          id: '0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
          slug: 'rarible',
          createdAt: '2020-07-15T10:30:00.000Z',
          updatedAt: '2024-12-01T10:30:00.000Z',
          name: 'Rarible',
          symbol: 'RARI',
          contractDeployedAt: '2020-07-15T10:30:00.000Z',
          image: 'https://lh3.googleusercontent.com/rarible-collection.png',
          banner: 'https://lh3.googleusercontent.com/rarible-banner.png',
          twitterUrl: 'https://twitter.com/rarible',
          discordUrl: null,
          externalUrl: 'https://rarible.com',
          twitterUsername: 'rarible',
          openseaVerificationStatus: 'verified',
          magicedenVerificationStatus: null,
          description: 'Rarible NFT Collection for E2E testing',
          metadataDisabled: false,
          isSpam: false,
          isNsfw: false,
          isMinting: false,
          sampleImages: [
            'https://lh3.googleusercontent.com/test-sample-image.png',
          ],
          tokenCount: '10000',
          onSaleCount: '500',
          primaryContract: '0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
          tokenSetId: 'contract:0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
          creator: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
          isSharedContract: false,
          royalties: null,
          allRoyalties: {
            eip2981: [],
            onchain: [],
          },
          floorAsk: {
            id: null,
            price: null,
            maker: null,
            validFrom: 2147483647,
            validUntil: null,
            token: null,
          },
          topBid: {
            id: null,
            sourceDomain: null,
            price: null,
            maker: null,
            validFrom: null,
            validUntil: null,
          },
          rank: {
            '1day': null,
            '7day': null,
            '30day': null,
            allTime: null,
          },
          volume: {
            '1day': 0,
            '7day': 0,
            '30day': 0,
            allTime: 0,
          },
          volumeChange: {
            '1day': null,
            '7day': null,
            '30day': null,
          },
          floorSale: {
            '1day': null,
            '7day': null,
            '30day': null,
          },
          floorSaleChange: {
            '1day': null,
            '7day': null,
            '30day': null,
          },
          collectionBidSupported: true,
          ownerCount: 1000,
          contractKind: 'erc721',
          mintedTimestamp: 1595000000,
          lastMintTimestamp: 1595000000,
          mintStages: [],
          supply: '10000',
          remainingSupply: '5000',
        },
      ],
    },
  });
};

describe(RegressionAssets('NFT Detection Modal'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft detection modal after user switches to mainnet and taps cancel when nft detection toggle is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(NftDetectionModal.container);

        await NftDetectionModal.tapCancelButton();
        // Check that we are on the wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Go to NFTs tab and check that the banner is visible
        await WalletView.tapNftTab();
        await Assertions.expectTextDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );
      },
    );
  });

  it('show nft detection modal after user switches to mainnet and taps allow when nftDetection toggle is off', async () => {
    const testNftOnMainnet = 'Rarible';

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
        testSpecificMock: nftApiMock,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(NftDetectionModal.container);
        await NftDetectionModal.tapAllowButton();
        // Check that we are on the wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Go to NFTs tab and check that the banner is NOT visible
        await WalletView.tapNftTab();
        await Assertions.expectTextNotDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );

        await Assertions.expectTextDisplayed(testNftOnMainnet);
      },
    );
  });
});
