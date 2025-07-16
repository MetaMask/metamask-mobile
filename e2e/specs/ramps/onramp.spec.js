'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { withFixtures } from '../../fixtures/fixture-helper';
import SoftAssert from '../../utils/SoftAssert';
import { getEventsPayloads } from '../analytics/helpers';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../fixtures/utils';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';

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

let mockServer;
let mockServerPort;

const setupOnRampTest = async (testFn) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet)
        .withRampsSelectedRegion(franceRegion)
        .withMetaMetricsOptIn()
        .build(),
      restartDevice: true,
      launchArgs: {
        mockServerPort,
      },
    },
    async () => {
      await loginToApp();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

describe(SmokeTrade('Onramp quote build screen'), () => {
  let shouldCheckProviderSelectedEvents = true;

  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('should get to the Amount to buy screen, after selecting Get Started', async () => {
    await setupOnRampTest(async () => {
      await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
      await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
      await BuildQuoteView.tapCancelButton();
    });
  });

  it('should skip to the Amount to buy screen for returning user', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
  });

  it('should enter amount and show quotes', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.enterAmount('100');
      await BuildQuoteView.tapGetQuotesButton();
      await Assertions.checkIfVisible(QuotesView.quotes);
    });
  });

  it('should expand the quotes section and select a provider', async () => {
    // Disabling synchronization to avoid race conditions
    await device.disableSynchronization();
    try {
      await QuotesView.tapExploreMoreOptions();
      await Assertions.checkIfVisible(QuotesView.expandedQuotesSection);
      await Assertions.checkIfVisible(QuotesView.continueWithProvider);
      await QuotesView.tapContinueWithProvider();
      await TestHelpers.pause(650); // Waiting for the last event to be sent
    } catch (error) {
      // We're ok catching this as there were not enough providers to select from
      shouldCheckProviderSelectedEvents = false;
      console.warn('No provider will be selected');
    }
  });

  it('should validate segment/metametric events for a successful onramp flow', async () => {
    const expectedEvents = {
      BUY_BUTTON_CLICKED: 'Buy Button Clicked',
      ONRAMP_GET_STARTED_CLICKED: 'On-ramp Get Started Clicked',
      ONRAMP_CANCELED: 'On-ramp Canceled',
      ONRAMP_QUOTES_REQUESTED: 'On-ramp Quotes Requested',
      ONRAMP_QUOTES_RECEIVED: 'On-ramp Quotes Received',
      ONRAMP_QUOTE_ERROR: 'On-ramp Quote Error',
      ONRAMP_QUOTES_EXPANDED: 'On-ramp Quotes Expanded',
      ONRAMP_PROVIDER_SELECTED: 'On-ramp Provider Selected',
    };

    const softAssert = new SoftAssert();
    const events = await getEventsPayloads(mockServer, [
      expectedEvents.BUY_BUTTON_CLICKED,
      expectedEvents.ONRAMP_CANCELED,
      expectedEvents.ONRAMP_GET_STARTED_CLICKED,
      expectedEvents.ONRAMP_QUOTES_REQUESTED,
      expectedEvents.ONRAMP_QUOTES_RECEIVED,
      expectedEvents.ONRAMP_QUOTE_ERROR,
      expectedEvents.ONRAMP_QUOTES_EXPANDED,
      expectedEvents.ONRAMP_PROVIDER_SELECTED,
    ]);

    // Find all events
    const buyButtonClicked = events.find(
      (event) => event.event === expectedEvents.BUY_BUTTON_CLICKED,
    );
    const onRampGetStartedClicked = events.find(
      (event) => event.event === expectedEvents.ONRAMP_GET_STARTED_CLICKED,
    );
    const onRampCanceled = events.find(
      (event) => event.event === expectedEvents.ONRAMP_CANCELED,
    );
    const onRampQuotesRequested = events.find(
      (event) => event.event === expectedEvents.ONRAMP_QUOTES_REQUESTED,
    );
    const onRampQuotesReceived = events.find(
      (event) => event.event === expectedEvents.ONRAMP_QUOTES_RECEIVED,
    );

    // Define all base assertion calls as variables
    const checkBuyButtonClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(buyButtonClicked);
    }, 'Buy Button Clicked: Should be present');

    const checkOnRampGetStartedClickedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampGetStartedClicked);
      },
      'On-ramp Get Started Clicked: Should be defined',
    );

    const checkOnRampGetStartedClickedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(
          onRampGetStartedClicked.properties,
          {
            text: 'Get Started',
            location: 'Get Started Screen',
          },
        );
      },
      'On-ramp Get Started Clicked: Should be present',
    );

    const checkOnRampCanceledDefined = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(onRampCanceled);
    }, 'On-ramp Canceled: Should be present');

    const checkOnRampCanceledProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectContains(onRampCanceled.properties, {
          location: 'Amount to Buy Screen',
          chain_id_destination: '1',
        });
      },
      'On-ramp Canceled: Should have correct properties',
    );

    const checkOnRampQuotesRequestedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampQuotesRequested);
      },
      'On-ramp Quotes Requested: Should be present',
    );

    const checkOnRampQuotesRequestedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          onRampQuotesRequested.properties,
          {
            amount: 'number',
            payment_method_id: 'string',
            location: 'string',
            currency_source: 'string',
            currency_destination: 'string',
            chain_id_destination: 'string',
          },
        );
      },
      'On-ramp Quotes Requested: Should have correct properties',
    );

    const checkOnRampQuotesReceivedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(onRampQuotesReceived);
      },
      'On-ramp Quotes Received: Should be present',
    );

    const checkOnRampQuotesReceivedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          onRampQuotesReceived.properties,
          {
            amount: 'number',
            payment_method_id: 'string',
            refresh_count: 'number',
            results_count: 'number',
            average_total_fee: 'number',
            average_gas_fee: 'number',
            average_processing_fee: 'number',
            average_total_fee_of_amount: 'number',
            quotes_amount_list: 'array',
            quotes_amount_first: 'number',
            quotes_amount_last: 'number',
            currency_source: 'string',
            currency_destination: 'string',
            average_crypto_out: 'number',
            chain_id_destination: 'string',
            provider_onramp_list: 'array',
            provider_onramp_first: 'string',
            provider_onramp_last: 'string',
            provider_onramp_most_reliable: 'string',
            provider_onramp_best_price: 'string',
          },
        );
      },
      'On-ramp Quotes Received: Should have correct properties',
    );

    // Collect all base assertions
    const baseAssertions = [
      checkBuyButtonClicked,
      checkOnRampGetStartedClickedDefined,
      checkOnRampGetStartedClickedProperties,
      checkOnRampCanceledDefined,
      checkOnRampCanceledProperties,
      checkOnRampQuotesRequestedDefined,
      checkOnRampQuotesRequestedProperties,
      checkOnRampQuotesReceivedDefined,
      checkOnRampQuotesReceivedProperties,
    ];

    // iOS-specific assertions
    let iosAssertions = [];
    if (device.getPlatform() === 'ios') {
      const onRampQuoteError = events.find(
        (event) => event.event === expectedEvents.ONRAMP_QUOTE_ERROR,
      );

      const checkOnRampQuoteErrorDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampQuoteError);
        },
        'On-ramp Quote Error: Should be defined',
      );

      const checkOnRampQuoteErrorProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampQuoteError.properties,
            {
              amount: 'number',
              payment_method_id: 'string',
              error_message: 'string',
              currency_source: 'string',
              currency_destination: 'string',
              provider_onramp: 'string',
              chain_id_destination: 'string',
            },
          );
        },
        'On-ramp Quote Error: Should have correct properties',
      );

      iosAssertions = [
        checkOnRampQuoteErrorDefined,
        checkOnRampQuoteErrorProperties,
      ];
    }

    // Provider-specific assertions
    let providerAssertions = [];
    if (shouldCheckProviderSelectedEvents) {
      const onRampQuotesExpanded = events.find(
        (event) => event.event === expectedEvents.ONRAMP_QUOTES_EXPANDED,
      );
      const onRampProviderSelected = events.find(
        (event) => event.event === expectedEvents.ONRAMP_PROVIDER_SELECTED,
      );

      const checkOnRampQuotesExpandedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampQuotesExpanded);
        },
        'On-ramp Quotes Expanded: Should be present',
      );

      const checkOnRampQuotesExpandedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampQuotesExpanded.properties,
            {
              payment_method_id: 'string',
              amount: 'number',
              refresh_count: 'number',
              results_count: 'number',
              provider_onramp_first: 'string',
              provider_onramp_list: 'array',
              previously_used_count: 'number',
              chain_id_destination: 'string',
              currency_source: 'string',
              currency_destination: 'string',
            },
          );
        },
        'On-ramp Quotes Expanded: Should have correct properties',
      );

      const checkOnRampProviderSelectedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(onRampProviderSelected);
        },
        'On-ramp Provider Selected: Should be present',
      );

      const checkOnRampProviderSelectedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            onRampProviderSelected.properties,
            {
              refresh_count: 'number',
              quote_position: 'number',
              results_count: 'number',
              payment_method_id: 'string',
              total_fee: 'number',
              gas_fee: 'number',
              processing_fee: 'number',
              exchange_rate: 'number',
              amount: 'number',
              is_best_rate: 'boolean',
              is_recommended: 'boolean',
              currency_source: 'string',
              currency_destination: 'string',
              provider_onramp: 'string',
              crypto_out: 'number',
              chain_id_destination: 'string',
            },
          );
        },
        'On-ramp Provider Selected: Should have correct properties',
      );

      providerAssertions = [
        checkOnRampQuotesExpandedDefined,
        checkOnRampQuotesExpandedProperties,
        checkOnRampProviderSelectedDefined,
        checkOnRampProviderSelectedProperties,
      ];
    }


    await Promise.all([
      ...baseAssertions,
      ...iosAssertions,
      ...providerAssertions,
    ]);

    softAssert.throwIfErrors();
  });
});
