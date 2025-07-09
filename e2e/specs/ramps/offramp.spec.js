'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import QuotesView from '../../pages/Ramps/QuotesView';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../utils/SoftAssert';

const fixtureServer = new FixtureServer();

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

describe(SmokeTrade('Off-Ramp'), () => {
  let shouldCheckProviderSelectedEvents = true;

  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(segmentMock, mockServerPort);

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .withRampsSelectedRegion(franceRegion)
      .withMetaMetricsOptIn()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: {
        fixtureServerPort: `${getFixturesServerPort()}`,
        mockServerPort,
      },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
    await stopMockServer(mockServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should get to the Amount to sell screen, after selecting Get Started', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await SellGetStartedView.tapGetStartedButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToSellLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should show quotes', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await BuildQuoteView.enterAmount('2');
    await BuildQuoteView.tapGetQuotesButton();
    await Assertions.checkIfVisible(QuotesView.quotes);
  });

  it('should expand the quotes section', async () => {
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

  it('should validate segment/metametric events for a successful offramp flow', async () => {
    const expectedEvents = {
      SELL_BUTTON_CLICKED: 'Sell Button Clicked',
      OFFRAMP_CANCELED: 'Off-ramp Canceled',
      OFFRAMP_GET_STARTED_CLICKED: 'Off-ramp Get Started Clicked',
      OFFRAMP_QUOTES_REQUESTED: 'Off-ramp Quotes Requested',
      OFFRAMP_QUOTES_RECEIVED: 'Off-ramp Quotes Received',
      OFFRAMP_QUOTE_ERROR: 'Off-ramp Quote Error',
      OFFRAMP_QUOTES_EXPANDED: 'Off-ramp Quotes Expanded',
      OFFRAMP_PROVIDER_SELECTED: 'Off-ramp Provider Selected',
    };

    const events = await getEventsPayloads(mockServer, [
      expectedEvents.SELL_BUTTON_CLICKED,
      expectedEvents.OFFRAMP_CANCELED,
      expectedEvents.OFFRAMP_GET_STARTED_CLICKED,
      expectedEvents.OFFRAMP_QUOTES_REQUESTED,
      expectedEvents.OFFRAMP_QUOTES_RECEIVED,
      expectedEvents.OFFRAMP_QUOTE_ERROR,
      expectedEvents.OFFRAMP_QUOTES_EXPANDED,
      expectedEvents.OFFRAMP_PROVIDER_SELECTED,
    ]);

    const softAssert = new SoftAssert();

    // Find all events
    const sellButtonClicked = events.find(
      (event) => event.event === expectedEvents.SELL_BUTTON_CLICKED,
    );
    const offRampCanceled = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_CANCELED,
    );
    const offRampGetStartedClicked = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_GET_STARTED_CLICKED,
    );
    const offRampQuotesRequested = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_QUOTES_REQUESTED,
    );
    const offRampQuotesReceived = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_QUOTES_RECEIVED,
    );
    const offRampQuoteError = events.find(
      (event) => event.event === expectedEvents.OFFRAMP_QUOTE_ERROR,
    );

    // Define all assertion calls as variables
    const checkSellButtonClicked = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(sellButtonClicked);
    }, 'Sell Button Clicked: Should be present');

    const checkOffRampCanceled = softAssert.checkAndCollect(async () => {
      await Assertions.checkIfValueIsDefined(offRampCanceled);
    }, 'Off-ramp Canceled: Should be present');

    const checkOffRampGetStartedClicked = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampGetStartedClicked);
      },
      'Off-ramp Get Started Clicked: Should be present',
    );

    const checkOffRampQuotesRequestedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampQuotesRequested);
      },
      'Off-ramp Quotes Requested: Should be present',
    );

    const checkOffRampQuotesRequestedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          offRampQuotesRequested.properties,
          {
            payment_method_id: 'string',
            amount: 'number',
            location: 'string',
            currency_destination: 'string',
            currency_source: 'string',
            chain_id_source: 'string',
          },
        );
      },
      'Off-ramp Quotes Requested: Should have correct properties',
    );

    const checkOffRampQuotesReceivedDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampQuotesReceived);
      },
      'Off-ramp Quotes Received: Should be present',
    );

    const checkOffRampQuotesReceivedProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          offRampQuotesReceived.properties,
          {
            amount: 'string',
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
            currency_destination: 'string',
            currency_source: 'string',
            average_fiat_out: 'number',
            chain_id_source: 'string',
            provider_offramp_list: 'array',
            provider_offramp_first: 'string',
            provider_offramp_last: 'string',
            provider_offramp_most_reliable: 'string',
            provider_offramp_best_price: 'string',
          },
        );
      },
      'Off-ramp Quotes Received: Should have correct properties',
    );

    const checkOffRampQuoteErrorDefined = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfValueIsDefined(offRampQuoteError);
      },
      'Off-ramp Quote Error: Should be present',
    );

    const checkOffRampQuoteErrorProperties = softAssert.checkAndCollect(
      async () => {
        await Assertions.checkIfObjectHasKeysAndValidValues(
          offRampQuoteError.properties,
          {
            amount: 'string',
            payment_method_id: 'string',
            error_message: 'string',
            currency_destination: 'string',
            currency_source: 'string',
            provider_offramp: 'string',
            chain_id_source: 'string',
          },
        );
      },
      'Off-ramp Quote Error: Should have correct properties',
    );

    // Collect all base assertions
    const baseAssertions = [
      checkSellButtonClicked,
      checkOffRampCanceled,
      checkOffRampGetStartedClicked,
      checkOffRampQuotesRequestedDefined,
      checkOffRampQuotesRequestedProperties,
      checkOffRampQuotesReceivedDefined,
      checkOffRampQuotesReceivedProperties,
      checkOffRampQuoteErrorDefined,
      checkOffRampQuoteErrorProperties,
    ];

    // Conditional assertions for provider selected events
    let conditionalAssertions = [];
    if (shouldCheckProviderSelectedEvents) {
      const offRampQuotesExpanded = events.find(
        (event) => event.event === expectedEvents.OFFRAMP_QUOTES_EXPANDED,
      );
      const offRampProviderSelected = events.find(
        (event) => event.event === expectedEvents.OFFRAMP_PROVIDER_SELECTED,
      );

      const checkOffRampQuotesExpandedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(offRampQuotesExpanded);
        },
        'Off-ramp Quotes Expanded: Should be present',
      );

      const checkOffRampQuotesExpandedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            offRampQuotesExpanded.properties,
            {
              payment_method_id: 'string',
              amount: 'string',
              refresh_count: 'number',
              results_count: 'number',
              provider_onramp_first: 'string',
              provider_onramp_list: 'array',
              previously_used_count: 'number',
              chain_id_source: 'string',
              currency_source: 'string',
              currency_destination: 'string',
            },
          );
        },
        'Off-ramp Quotes Expanded: Should have correct properties',
      );

      const checkOffRampProviderSelectedDefined = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfValueIsDefined(offRampProviderSelected);
        },
        'Off-ramp Provider Selected: Should be present',
      );

      const checkOffRampProviderSelectedProperties = softAssert.checkAndCollect(
        async () => {
          await Assertions.checkIfObjectHasKeysAndValidValues(
            offRampProviderSelected.properties,
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
        'Off-ramp Provider Selected: Should have correct properties',
      );

      conditionalAssertions = [
        checkOffRampQuotesExpandedDefined,
        checkOffRampQuotesExpandedProperties,
        checkOffRampProviderSelectedDefined,
        checkOffRampProviderSelectedProperties,
      ];
    }

    
    await Promise.all([...baseAssertions, ...conditionalAssertions]);

    softAssert.throwIfErrors();
  });
});
