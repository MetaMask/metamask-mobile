'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import { SmokeRamps } from '../../tags';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';

const axios = require('axios');



describe(SmokeRamps('On-Ramp Limits'), () => {
  let mockServer;
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  afterAll(async () => {
    if (mockServer) await stopMockServer(mockServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should make an onramp purchase', async () => {
    

    const franceRegion = {
      currencies: ['/currencies/fiat/eur'],
      emoji: '🇫🇷',
      id: '/regions/fr',
      name: 'France',
      support: { buy: true, sell: true, recurringBuy: true },
      unsupported: false,
      recommended: false,
      detected: false,
    };

    const mockServerPort = getMockServerPort();
    
    // Generate a random order ID
    const randomOrderId = Math.floor(Math.random() * 10000000000).toString();
    
    // Get current timestamp
    const currentTimestamp = Date.now();
    
    const mockResponse = {
      id: `/providers/ramp-network-staging/orders/${randomOrderId}`,
      isOnlyLink: false,
      provider: {
        id: "/providers/ramp-network-staging",
        name: "Ramp Network (Staging)",
        environmentType: "STAGING",
        description: "Ramp is building the infrastructure to seamlessly connect Web3 with today's global financial system. Through its core on- and off-ramp products, Ramp provides businesses and individuals across 150+ countries with a streamlined and smooth experience in converting between crypto and fiat currencies. Ramp is fully integrated with the world's major payment methods, including debit and credit cards, bank transfers, Apple Pay, Google Pay, and more.",
        hqAddress: "8 The Green, STE B, Dover, County of Kent, DE 19901, USA",
        links: [
          { name: "Homepage", url: "https://ramp.network/" },
          { name: "Terms of Service", url: "https://ramp.network/terms-of-service" },
          { name: "Support", url: "https://support.ramp.network/en/collections/6690-customer-support-help-center" }
        ],
        logos: {
          light: "/assets/providers/ramp-logo-light.png",
          dark: "/assets/providers/ramp-logo-dark.png",
          height: 24,
          width: 79
        },
        features: {
          buy: {
            enabled: true,
            userAgent: null,
            padCustomOrderId: true,
            orderCustomId: "DIGITS_10",
            browser: "APP_BROWSER",
            orderCustomIdRequired: true,
            orderCustomIdExpiration: 60,
            orderCustomIdSeparator: null,
            orderCustomIdPrefixes: [],
            supportedByBackend: true,
            redirection: "JSON_REDIRECTION"
          },
          quotes: {
            enabled: false,
            supportedByBackend: false
          },
          sell: {
            enabled: false
          },
          sellQuotes: {
            enabled: false
          },
          recurringBuy: {}
        }
      },
      cryptoCurrency: {
        id: "/currencies/crypto/1/0x0000000000000000000000000000000000000000",
        idv2: "/currencies/crypto/1/0x0000000000000000000000000000000000000000",
        legacyId: "/currencies/crypto/1/eth",
        network: {
          active: true,
          chainId: "1",
          chainName: "Ethereum Mainnet",
          shortName: "Ethereum"
        },
        logo: "https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ethereum"
      },
      fiatCurrency: {
        id: "/currencies/fiat/usd",
        symbol: "USD",
        name: "US Dollar",
        decimals: 2,
        denomSymbol: "$"
      },
      cryptoAmount: 0.02868312787958739,
      fiatAmount: 50,
      paymentMethod: {
        id: "/payments/debit-credit-card",
        paymentType: "debit-credit-card",
        name: "Debit or Credit",
        score: 90,
        icons: [
          { type: "materialIcons", name: "card" }
        ],
        logo: {
          light: [
            "assets/Visa-regular@3x.png",
            "assets/Mastercard-regular@3x.png"
          ],
          dark: [
            "assets/Visa@3x.png",
            "assets/Mastercard@3x.png"
          ]
        },
        disclaimer: "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
        delay: [5, 10],
        pendingOrderDescription: "Card purchases may take a few minutes to complete.",
        amountTier: [1, 3],
        sellEnabled: true
      },
      success: true,
      createdAt: currentTimestamp,
      totalFeesFiat: 2.84682192,
      fiatAmountInUsd: 50,
      feesInUsd: 2.84682192,
      walletAddress: "0x57444aE5630d7a8305418eF8abA472ea1B1Afbc6",
      providerOrderId: "b1ad7b3b-95bb-4539-a9f4-7f18b0de9bae",
      providerOrderLink: "https://transactions.demo.rampnetwork.com/#/details/s5jnf6ypjsda8jh?secret=sfwdhosutjpf2qwu",
      network: "11155111",
      status: "PENDING",
      canBeUpdated: true,
      idExpirationDate: null,
      idHasExpired: false,
      excludeFromPurchases: false,
      timeDescriptionPending: "Your order for ETH is processing. Card purchases may take a few minutes to complete.",
      statusDescription: "Your order for ETH is processing. Card purchases may take a few minutes to complete.",
      orderType: "BUY",
      exchangeRate: 1643.9343114164685,
      context: "mobile",
      recurring: null
    };

    const testSpecificMock = {
      POST: [
        {
          urlEndpoint: `https://on-ramp.dev-api.cx.metamask.io/providers/ramp-network-staging/orders/${randomOrderId}`,
          response: mockResponse,
          responseCode: 200,
        },
      ],
    };

    mockServer = await startMockServer(testSpecificMock, mockServerPort);

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withRampsSelectedRegion(franceRegion)
          .withRampsSelectedPaymentMethod()
          .build(),
        restartDevice: true,
      },
      async () => {
        await TestHelpers.launchApp({
          launchArgs: { fixtureServerPort: `${getFixturesServerPort()}`, mockServerPort: `${mockServerPort}` },
        });
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapBuyButton();
        await BuyGetStartedView.tapGetStartedButton();
        await BuildQuoteView.enterAmount('20');
        await BuildQuoteView.tapGetQuotesButton();
        await QuotesView.tapExploreMoreOptionsButton();
        await QuotesView.tapRampNetworkButton();

        // Direct call to mock server to verify the mocked response
        const mockServerUrl = `http://localhost:${mockServerPort}/proxy?url=${encodeURIComponent(`https://on-ramp.dev-api.cx.metamask.io/providers/ramp-network-staging/orders/${randomOrderId}`)}`;
        const requestBody = {
          fiatAmount: 20,
          fiatCurrency: 'USD',
          cryptoCurrency: 'ETH',
          network: '1',
          walletAddress: wallet.address,
          context: 'mobile',
          sdk: '2.0.14'
        };
        const mockedResponse = await axios.post(mockServerUrl, requestBody);
        console.log('Mocked Response:', mockedResponse.data);
        
      },
    );
  });
});