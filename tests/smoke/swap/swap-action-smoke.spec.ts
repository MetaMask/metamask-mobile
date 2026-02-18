import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeTrade } from '../../tags';
import {
  submitSwapUnifiedUI,
  checkSwapActivity,
} from '../../helpers/swap/swap-unified-ui';
import { loginToApp } from '../../flows/wallet.flow';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { testSpecificMock } from '../../helpers/swap/swap-mocks';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import {
  EventPayload,
  getEventsPayloads,
} from '../../helpers/analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';
import Assertions from '../../framework/Assertions';

const expectedEvents = {
  ActionButtonClicked: 'Action Button Clicked',
  UnifiedSwapBridgeInputChanged: 'Unified SwapBridge Input Changed',
  UnifiedSwapBridgeQuotesRequested: 'Unified SwapBridge Quotes Requested',
  UnifiedSwapBridgeQuotesReceived: 'Unified SwapBridge Quotes Received',
  UnifiedSwapBridgeSubmitted: 'Unified SwapBridge Submitted',
  UnifiedSwapBridgeCompleted: 'Unified SwapBridge Completed',
  UnifiedSwapBridgeFailed: 'Unified SwapBridge Failed',
  UnifiedSwapBridgeCancelled: 'Unified SwapBridge Cancelled',
};

const expectedEventNames = [
  expectedEvents.ActionButtonClicked,
  expectedEvents.UnifiedSwapBridgeInputChanged,
  expectedEvents.UnifiedSwapBridgeQuotesRequested,
  expectedEvents.UnifiedSwapBridgeQuotesReceived,
  expectedEvents.UnifiedSwapBridgeSubmitted,
  expectedEvents.UnifiedSwapBridgeCompleted,
];

describe(SmokeTrade('Swap from Actions'), (): void => {
  beforeEach(async (): Promise<void> => {
    jest.setTimeout(180000);
  });

  let eventsToCheck: EventPayload[];

  it('swaps ETH->USDC with custom slippage and USDC->ETH', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withNetworkController({
            providerConfig: {
              chainId: '0x1',
              rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
              type: 'custom',
              nickname: 'Localhost',
              ticker: 'ETH',
            },
          })
          .withDisabledSmartTransactions()
          .withMetaMetricsOptIn()
          .build(),
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
              // Load pre-built state with USDC and DAI contracts + balances
              // This avoids needing a mainnet fork while still having readable token balances
              loadState: './tests/smoke/swap/withTokens.json',
            },
          },
        ],
        testSpecificMock,
        restartDevice: true,
      },
      async ({ mockServer }) => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();

        // Submit first swap: ETH->ERC20 (USDC) with custom slippage
        await submitSwapUnifiedUI('1', 'ETH', 'USDC', '0x1', {
          slippage: '3.5',
        });
        await checkSwapActivity('ETH', 'USDC');

        // Get Events from the first swap
        eventsToCheck = await getEventsPayloads(mockServer, expectedEventNames);

        await TabBarComponent.tapWallet();
        await WalletView.tapWalletSwapButton();

        // Submit second swap: ERC20->ETH
        // Uses pre-funded USDC balance from loadState
        await submitSwapUnifiedUI('100', 'USDC', 'ETH', '0x1');
        await checkSwapActivity('USDC', 'ETH');
      },
    );
  });

  it('validates the segment events from the swap action smoke test', async (): Promise<void> => {
    if (!eventsToCheck) {
      throw new Error('Events to check are not defined');
    }

    const softAssert = new SoftAssert();
    for (const ev of expectedEventNames) {
      const event = eventsToCheck.find((event) => event.event === ev);
      await softAssert.checkAndCollect(
        async () => await Assertions.checkIfValueIsDefined(event),
        `${ev}: Should be defined`,
      );
    }

    /**
     * Unified SwapBridge Input Changed
     * --------------------------------
     * The first 3 events are fired as soon as the page is viewed since source
     * and destination are prefilled (chainSource, chainDestination, token destination)
     * The remaning 3 events correspond to:
     * - token destination
     * - slippage twice
     */
    const unifiedSwapBridgeInputChanged = eventsToCheck.filter(
      (event) => event.event === expectedEvents.UnifiedSwapBridgeInputChanged,
    );
    // Check that all input changed events have the correct properties
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfArrayHasLength(
          unifiedSwapBridgeInputChanged,
          6,
        ),
      'Unified SwapBridge Input Changed: Should have 6 events',
    );
    for (const event of unifiedSwapBridgeInputChanged) {
      await softAssert.checkAndCollect(
        async () =>
          await Assertions.checkIfValueIsDefined(event.properties.input),
        'Unified SwapBridge Input Changed: input should be defined',
      );
      await softAssert.checkAndCollect(
        async () =>
          await Assertions.checkIfValueIsDefined(event.properties.input_value),
        'Unified SwapBridge Input Changed: input_value should be defined',
      );
      await softAssert.checkAndCollect(
        async () =>
          await Assertions.checkIfValueIsDefined(event.properties.action_type),
        'Unified SwapBridge Input Changed: action_type should be defined',
      );
    }
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          unifiedSwapBridgeInputChanged.some(
            (event) => event.properties.input === 'chain_source',
          ) || undefined,
        ),
      'Unified SwapBridge Input Changed: Should have an event with input=chain_source',
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          unifiedSwapBridgeInputChanged.some(
            (event) => event.properties.input === 'token_destination',
          ) || undefined,
        ),
      'Unified SwapBridge Input Changed: Should have an event with input=token_destination',
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfValueIsDefined(
          unifiedSwapBridgeInputChanged.some(
            (event) => event.properties.input === 'slippage',
          ) || undefined,
        ),
      'Unified SwapBridge Input Changed: Should have an event with input=slippage',
    );

    /**
     * Unified SwapBridge Quotes Requested
     */
    const unifiedSwapBridgeQuotesRequested = eventsToCheck.filter(
      (event) =>
        event.event === expectedEvents.UnifiedSwapBridgeQuotesRequested,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfArrayHasLength(
          unifiedSwapBridgeQuotesRequested,
          3,
        ),
      'Unified SwapBridge Quotes Requested: Should have 3 events',
    );
    for (const event of unifiedSwapBridgeQuotesRequested) {
      await softAssert.checkAndCollect(
        async () =>
          await Assertions.checkIfObjectHasKeysAndValidValues(
            event.properties,
            {
              chain_id_source: 'string',
              chain_id_destination: 'string',
              token_address_source: 'string',
              token_address_destination: 'string',
              slippage_limit: 'number',
              swap_type: 'string',
              custom_slippage: 'boolean',
              is_hardware_wallet: 'boolean',
              has_sufficient_funds: 'boolean',
              stx_enabled: 'boolean',
              token_symbol_source: 'string',
              token_symbol_destination: 'string',
              security_warnings: 'array',
              warnings: 'array',
              usd_amount_source: 'number',
              action_type: 'string',
            },
          ),
        'Unified SwapBridge Quotes Requested: Should have the correct properties',
      );
    }

    /**
     * Unified SwapBridge Submitted
     */
    const unifiedSwapBridgeSubmitted = eventsToCheck.filter(
      (event) => event.event === expectedEvents.UnifiedSwapBridgeSubmitted,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfArrayHasLength(unifiedSwapBridgeSubmitted, 1),
      'Unified SwapBridge Submitted: Should have 1 event',
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectHasKeysAndValidValues(
          unifiedSwapBridgeSubmitted[0]?.properties ?? {},
          {
            action_type: 'string',
            price_impact: 'number',
            usd_quoted_gas: 'number',
            gas_included: 'boolean',
            gas_included_7702: 'boolean',
            provider: 'string',
            quoted_time_minutes: 'number',
            usd_quoted_return: 'number',
            chain_id_source: 'string',
            token_symbol_source: 'string',
            chain_id_destination: 'string',
            token_symbol_destination: 'string',
            is_hardware_wallet: 'boolean',
            swap_type: 'string',
            usd_amount_source: 'number',
            stx_enabled: 'boolean',
            custom_slippage: 'boolean',
          },
        ),
      'Unified SwapBridge Submitted: Should have the correct properties',
    );

    /**
     * Unified SwapBridge Completed
     */
    const unifiedSwapBridgeCompleted = eventsToCheck.filter(
      (event) => event.event === expectedEvents.UnifiedSwapBridgeCompleted,
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfArrayHasLength(unifiedSwapBridgeCompleted, 1),
      'Unified SwapBridge Completed: Should have 1 event',
    );
    await softAssert.checkAndCollect(
      async () =>
        await Assertions.checkIfObjectHasKeysAndValidValues(
          unifiedSwapBridgeCompleted[0]?.properties ?? {},
          {
            action_type: 'string',
            chain_id_source: 'string',
            token_symbol_source: 'string',
            token_address_source: 'string',
            chain_id_destination: 'string',
            token_symbol_destination: 'string',
            token_address_destination: 'string',
            slippage_limit: 'number',
            custom_slippage: 'boolean',
            usd_amount_source: 'number',
            swap_type: 'string',
            is_hardware_wallet: 'boolean',
            stx_enabled: 'boolean',
            security_warnings: 'array',
            usd_quoted_gas: 'number',
            gas_included: 'boolean',
            gas_included_7702: 'boolean',
            provider: 'string',
            quoted_time_minutes: 'number',
            usd_quoted_return: 'number',
            source_transaction: 'string',
            destination_transaction: 'string',
            actual_time_minutes: 'number',
            usd_actual_return: 'number',
            usd_actual_gas: 'string',
            quote_vs_execution_ratio: 'number',
            quoted_vs_used_gas_ratio: 'number',
            price_impact: 'number',
          },
        ),
      'Unified SwapBridge Completed: Should have the correct properties',
    );

    softAssert.throwIfErrors();
  });
});
