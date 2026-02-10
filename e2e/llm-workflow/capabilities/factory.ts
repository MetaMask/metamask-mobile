import type {
  WorkflowContext,
  E2EEnvironmentConfig,
} from '@metamask/client-mcp-core';
import { MetaMaskMobileBuildCapability } from './build';
import { MetaMaskMobileFixtureCapability } from './fixture';
import { MetaMaskMobileChainCapability } from './chain';
import { MetaMaskMobileContractSeedingCapability } from './seeding';
import { MetaMaskMobileStateSnapshotCapability } from './state-snapshot';
import { MetaMaskMobileMockServerCapability } from './mock-server';

export interface CreateMetaMaskMobileE2EContextOptions {
  config?: Partial<E2EEnvironmentConfig>;
  buildCommand?: string;
  buildOutputPath?: string;
  simulatorName?: string;
}

const DEFAULT_E2E_CONFIG: E2EEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  toolPrefix: 'mm',
  artifactsDir: 'test-artifacts',
  environment: 'e2e',
  defaultChainId: 1337,
};

/**
 * Creates a MetaMask Mobile E2E workflow context with all 6 capabilities wired together.
 *
 * @param options - Configuration options for the context
 * @returns WorkflowContext with all capabilities instantiated and configured
 *
 * @example
 * ```typescript
 * const context = createMetaMaskMobileE2EContext({
 *   config: { defaultChainId: 1337 },
 *   simulatorName: 'iPhone 16',
 * });
 * ```
 */
export function createMetaMaskMobileE2EContext(
  options: CreateMetaMaskMobileE2EContextOptions = {},
): WorkflowContext {
  const config: E2EEnvironmentConfig = {
    ...DEFAULT_E2E_CONFIG,
    ...options.config,
  };

  const build = new MetaMaskMobileBuildCapability({
    command: options.buildCommand,
    outputPath: options.buildOutputPath,
    simulatorName: options.simulatorName,
  });

  const fixture = new MetaMaskMobileFixtureCapability();

  const chain = new MetaMaskMobileChainCapability();

  const contractSeeding = new MetaMaskMobileContractSeedingCapability({
    chainCapability: chain,
  });

  const stateSnapshot = new MetaMaskMobileStateSnapshotCapability();

  const mockServer = new MetaMaskMobileMockServerCapability();

  return {
    build,
    fixture,
    chain,
    contractSeeding,
    stateSnapshot,
    mockServer,
    config,
  };
}
