import {
  ScenarioContext,
  ScenarioPhase,
  ScenarioRunResult,
  SwapsPerformanceScenario,
} from '../types';
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
    lastText = context.getVisibleText('dest-token-area-input', true);
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
      context.clickTestId('homepage-action-buttons-grid-swap');
      context.waitForTestId('source-token-area-input', 15_000);
    }),
  );

  const sourceTokenText = context.getExactScreenText(
    'source-token-selector-button',
  );
  if (!sourceTokenText?.toUpperCase().includes('ETH')) {
    throw new Error(
      'Expected ETH as the source token. Switch the Wallet to Ethereum and retry.',
    );
  }

  context.log('selecting Ethereum USDC as the destination');
  phases.push(
    await context.measurePhase('select-destination', () => {
      context.clickTestId('dest-token-selector-button');
      // USDC is a prioritized Ethereum asset and has a unique chain-scoped ID.
      context.waitForTestId('asset-0x1-USDC', 20_000);
      context.clickTestId('asset-0x1-USDC');
      context.waitForTestId('dest-token-area-input', 10_000);
    }),
  );

  context.log('entering 1 ETH and waiting for the first quote');
  phases.push(
    await context.measurePhase('fetch-first-quote', async () => {
      context.clickTestId('source-token-area-input');
      context.waitForTestId('keypad-delete-button', 10_000);
      context.clickTestId('keypad-delete-button');
      context.clickTestId('keypad-key-1');
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
  run: runScenario001,
};
