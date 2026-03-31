import type { Mockttp } from 'mockttp';
import { setupSendBalancesMock } from './send-balances';

/**
 * Signature for test-specific mock setup functions.
 * Matches the TestSpecificMock type from the E2E framework.
 */
export type TestMock = (server: Mockttp) => Promise<void>;

/**
 * Registry of named mock overrides that can be referenced from flow YAML
 * via `mock:<name>` tags. Each entry maps to a function that configures
 * high-priority mockttp rules, overriding the default mock responses.
 *
 * Example YAML tag: `mock:send-balances`
 */
const registry: Record<string, TestMock> = {
  'send-balances': setupSendBalancesMock,
};

/**
 * Look up a mock override by name.
 * @returns The mock setup function, or undefined if not found.
 */
export function getMockOverride(name: string): TestMock | undefined {
  return registry[name];
}

export { registry };
