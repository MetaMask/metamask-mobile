import type {
  WorkflowContext,
  E2EEnvironmentConfig,
  ProdEnvironmentConfig,
} from '@metamask/client-mcp-core';
import { MetaMaskMobileBuildCapability } from './build';
import { MetaMaskMobileFixtureCapability } from './fixture';
import { MetaMaskMobileChainCapability } from './chain';
import { MetaMaskMobileContractSeedingCapability } from './seeding';
import { MetaMaskMobileStateSnapshotCapability } from './state-snapshot';
import { MetaMaskMobileMockServerCapability } from './mock-server';

interface BuildCapabilityOptions {
  buildOutputPath?: string;
  simulatorName?: string;
}

export interface CreateMetaMaskMobileE2EContextOptions
  extends BuildCapabilityOptions {
  config?: Partial<Omit<E2EEnvironmentConfig, 'environment'>>;
}

export interface CreateMetaMaskMobileProdContextOptions
  extends BuildCapabilityOptions {
  config?: Partial<Omit<ProdEnvironmentConfig, 'environment'>>;
}

const DEFAULT_E2E_CONFIG: E2EEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  toolPrefix: 'mm',
  artifactsDir: 'test-artifacts',
  environment: 'e2e',
  defaultChainId: 1337,
};

const DEFAULT_PROD_CONFIG: ProdEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  toolPrefix: 'mm',
  artifactsDir: 'test-artifacts',
  environment: 'prod',
  defaultChainId: 1,
};

/**
 * Creates a MetaMask Mobile E2E workflow context with all 6 capabilities.
 *
 * Requires IS_TEST=true or METAMASK_ENVIRONMENT=e2e env vars in .js.env
 * for Metro to activate e2e module resolution.
 */
export function createMetaMaskMobileE2EContext(
  options: CreateMetaMaskMobileE2EContextOptions = {},
): WorkflowContext {
  const config: E2EEnvironmentConfig = {
    ...DEFAULT_E2E_CONFIG,
    ...options.config,
    environment: 'e2e',
  };

  const build = new MetaMaskMobileBuildCapability({
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

/**
 * Creates a MetaMask Mobile production workflow context.
 *
 * Only includes build and state-snapshot capabilities.
 * No fixture server, no Anvil chain, no contract seeding, no mock server.
 * This is the default for developers running the app without e2e env vars.
 * Watch mode (Metro bundler) is fully supported.
 */
export function createMetaMaskMobileProdContext(
  options: CreateMetaMaskMobileProdContextOptions = {},
): WorkflowContext {
  const config: ProdEnvironmentConfig = {
    ...DEFAULT_PROD_CONFIG,
    ...options.config,
    environment: 'prod',
  };

  const build = new MetaMaskMobileBuildCapability({
    outputPath: options.buildOutputPath,
    simulatorName: options.simulatorName,
  });

  const stateSnapshot = new MetaMaskMobileStateSnapshotCapability();

  return {
    build,
    stateSnapshot,
    config,
  };
}
