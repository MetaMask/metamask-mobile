import { ScenarioMetadata } from '../types';

export const SCENARIO_001_METADATA: ScenarioMetadata = {
  id: 'SWAPS-PERF-001',
  number: '001',
  name: 'Open Swaps and fetch a 1 ETH quote',
  slug: 'open-swaps-fetch-one-eth-quote',
  description:
    'Measures the work performed while opening Swaps, selecting Ethereum USDC, entering 1 ETH, and waiting for the first positive quote.',
  platform: 'ios-simulator',
  preconditions: [
    'A booted iOS Simulator with a development build installed.',
    'An unlocked wallet on Ethereum Mainnet showing the Wallet view.',
    'An active mm and Hermes session connected to Metro.',
    'The temporary Swaps performance instrumentation is prepared before Metro starts.',
  ],
};
