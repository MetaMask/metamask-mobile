import type { Mockttp } from 'mockttp';
import { setupSendBalancesMock } from './send-balances';

/**
 * Signature for test-specific mock setup functions.
 * Matches the TestSpecificMock type from the E2E framework.
 */
export type TestMock = (server: Mockttp) => Promise<void>;

/**
 * Registry of named mock overrides that can be referenced from flow YAML
 * via `mock:<name>` tags.
 *
 * - `mock:default` — starts MockServerE2E with DEFAULT_MOCKS only (no extra overrides)
 * - `mock:<name>` — starts MockServerE2E with DEFAULT_MOCKS + the named override function
 *
 * Flows without a `mock:` tag will not start a mock server at all.
 */
const registry: Record<string, TestMock> = {
  default: async () => {
    /* no extra overrides — DEFAULT_MOCKS only */
  },
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
