import {
  ScenarioContext,
  ScenarioPhase,
  ScenarioRunResult,
  SwapsPerformanceScenario,
} from '../types';
import { SCENARIO_001_LOCATORS } from './locators';
import { SCENARIO_001_METADATA } from './metadata';

const QUOTE_TIMEOUT_MS = 30_000;
const QUOTE_POLL_INTERVAL_MS = 350;

export function hasPositiveNumericValue(text: string | null): boolean {
  if (!text) {
    return false;
  }

  const matches = text.match(/[0-9][0-9,.]*/gu) ?? [];
  return matches.some((match) => Number(match.replaceAll(',', '')) > 0);
}

async function waitForPositiveQuote(context: ScenarioContext): Promise<void> {
  const deadline = context.now() + QUOTE_TIMEOUT_MS;
  let lastText: string | null = null;

  while (context.now() < deadline) {
    lastText = context.getVisibleText(
      SCENARIO_001_LOCATORS.destinationAmountInput,
      true,
    );
    if (hasPositiveNumericValue(lastText)) {
      return;
    }
    await context.delay(QUOTE_POLL_INTERVAL_MS);
  }

  throw new Error(
    `First quote did not become visible within ${QUOTE_TIMEOUT_MS}ms; last destination text was ${JSON.stringify(
      lastText,
    )}`,
  );
}

async function runScenario001(
  context: ScenarioContext,
): Promise<ScenarioRunResult> {
  const phases: ScenarioPhase[] = [];

  context.log('opening Swaps');
  phases.push(
    await context.measurePhase('open-swaps', () => {
      context.clickTestId(SCENARIO_001_LOCATORS.openSwaps);
      context.waitForTestId(SCENARIO_001_LOCATORS.sourceAmountInput, 15_000);
    }),
  );

  const sourceTokenText = context.getExactScreenText(
    SCENARIO_001_LOCATORS.sourceTokenSelector,
  );
  if (!sourceTokenText?.toUpperCase().includes('ETH')) {
    throw new Error(
      'Expected ETH as the source token. Switch the Wallet to Ethereum and retry.',
    );
  }

  context.log('selecting Ethereum USDC as the destination');
  phases.push(
    await context.measurePhase('select-destination', () => {
      context.clickTestId(SCENARIO_001_LOCATORS.destinationTokenSelector);
      // USDC is a prioritized Ethereum asset and has a unique chain-scoped ID.
      context.waitForTestId(SCENARIO_001_LOCATORS.ethereumUsdc, 20_000);
      context.clickTestId(SCENARIO_001_LOCATORS.ethereumUsdc);
      context.waitForTestId(
        SCENARIO_001_LOCATORS.destinationAmountInput,
        10_000,
      );
    }),
  );

  context.log('entering 1 ETH and waiting for the first quote');
  phases.push(
    await context.measurePhase('fetch-first-quote', async () => {
      context.clickTestId(SCENARIO_001_LOCATORS.sourceAmountInput);
      context.waitForTestId(SCENARIO_001_LOCATORS.keypadDelete, 10_000);
      context.clickTestId(SCENARIO_001_LOCATORS.keypadDelete);
      context.clickTestId(SCENARIO_001_LOCATORS.keypadDigitOne);
      await waitForPositiveQuote(context);
    }),
  );

  return {
    phases,
    preconditions: {
      walletUnlocked: true,
      sourceTokenText,
      destinationToken: 'USDC',
      sourceAmount: '1',
    },
  };
}

export const scenario001: SwapsPerformanceScenario = {
  metadata: SCENARIO_001_METADATA,
  startingTestId: SCENARIO_001_LOCATORS.openSwaps,
  run: runScenario001,
};
