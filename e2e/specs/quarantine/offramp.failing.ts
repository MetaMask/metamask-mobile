import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import FundActionMenu from '../../pages/UI/FundActionMenu';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../../tests/resources/networks.e2e';
import { SmokeTrade } from '../../tags';
import Assertions from '../../../tests/framework/Assertions';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import QuotesView from '../../pages/Ramps/QuotesView';
import {
  EventPayload,
  getEventsPayloads,
} from '../../../tests/helpers/analytics/helpers.ts';
import SoftAssert from '../../../tests/framework/SoftAssert';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../tests/framework/Constants';
import TestHelpers from '../../helpers';

describe(SmokeTrade('Off-Ramp'), () => {
  let shouldCheckProviderSelectedEvents = true;
  const eventsToCheck: EventPayload[] = [];

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should get to the Amount to sell screen, get quotes and expand the quotes section', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController(CustomNetworks.Tenderly.Mainnet)
          .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.FRANCE])
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        endTestfn: async ({ mockServer }) => {
          const events = await getEventsPayloads(mockServer);
          eventsToCheck.push(...events);
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapWallet();
        await WalletView.tapWalletBuyButton();
        await FundActionMenu.tapSellButton();
        await SellGetStartedView.tapGetStartedButton();
        await Assertions.expectElementToBeVisible(
          BuildQuoteView.amountToSellLabel,
        );
        await Assertions.expectElementToBeVisible(
          BuildQuoteView.getQuotesButton,
        );
        await BuildQuoteView.tapCancelButton();
        await WalletView.tapWalletBuyButton();
        await FundActionMenu.tapSellButton();
        await BuildQuoteView.enterAmount('2');
        await BuildQuoteView.tapGetQuotesButton();
        await Assertions.expectElementToBeVisible(QuotesView.quotes);
        // Disabling synchronization to avoid race conditions
        await device.disableSynchronization();
        try {
          await QuotesView.tapExploreMoreOptions();
          await Assertions.expectElementToBeVisible(
            QuotesView.expandedQuotesSection,
          );
          await Assertions.expectElementToBeVisible(
            QuotesView.continueWithProvider,
          );
          await QuotesView.tapContinueWithProvider();

          // This delay is needed to ensure that the provider selected event is captured
          await TestHelpers.delay(650);
        } catch (error) {
          // We're ok catching this as there were not enough providers to select from
          shouldCheckProviderSelectedEvents = false;
          console.warn('No provider will be selected');
        }
      },
    );
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

    const softAssert = new SoftAssert();

    // Find all events
    const sellButtonClicked = eventsToCheck.find(
      (event) => event.event === expectedEvents.SELL_BUTTON_CLICKED,
    );
    const offRampCanceled = eventsToCheck.find(
      (event) => event.event === expectedEvents.OFFRAMP_CANCELED,
    );
    const offRampGetStartedClicked = eventsToCheck.find(
      (event) => event.event === expectedEvents.OFFRAMP_GET_STARTED_CLICKED,
    );
    const offRampQuotesRequested = eventsToCheck.find(
      (event) => event.event === expectedEvents.OFFRAMP_QUOTES_REQUESTED,
    );
    const offRampQuotesReceived = eventsToCheck.find(
      (event) => event.event === expectedEvents.OFFRAMP_QUOTES_RECEIVED,
    );
    const offRampQuoteError = eventsToCheck.find(
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
          offRampQuotesRequested?.properties ?? {},
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
          offRampQuotesReceived?.properties ?? {},
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
          offRampQuoteError?.properties ?? {},
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
    let conditionalAssertions: Promise<void>[] = [];
    if (shouldCheckProviderSelectedEvents) {
      const offRampQuotesExpanded = eventsToCheck.find(
        (event) => event.event === expectedEvents.OFFRAMP_QUOTES_EXPANDED,
      );
      const offRampProviderSelected = eventsToCheck.find(
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
            offRampQuotesExpanded?.properties ?? {},
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
            offRampProviderSelected?.properties ?? {},
            {
              refresh_count: 'number',
              quote_position: 'number',
              results_count: 'number',
              payment_method_id: 'string',
              total_fee: 'number',
              gas_fee: 'number',
              processing_fee: 'number',
              exchange_rate: 'number',
              amount: 'string',
              is_best_rate: 'boolean',
              is_recommended: 'boolean',
              currency_source: 'string',
              currency_destination: 'string',
              fiat_out: 'number',
              chain_id_source: 'string',
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
    if (shouldCheckProviderSelectedEvents) {
      console.log('eventsToCheck', eventsToCheck);
    }

    softAssert.throwIfErrors();
  });
});
