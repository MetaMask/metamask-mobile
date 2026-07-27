import type {
  E2EEnvironmentConfig,
  IPlatformDriver,
  ProdEnvironmentConfig,
  WorkflowContext,
} from '@metamask/client-mcp-core';

import { MetaMaskMobileChainCapability } from './chain';
import { MetaMaskMobileContractSeedingCapability } from './seeding';
import { MetaMaskMobileFixtureCapability } from './fixture';
import { MetaMaskMobileMockServerCapability } from './mock-server';
import { MetaMaskMobileStateSnapshotCapability } from './state-snapshot';

const DEFAULT_E2E_CONFIG: E2EEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  artifactsDir: 'test-artifacts',
  environment: 'e2e',
  defaultChainId: 1337,
};

const DEFAULT_PROD_CONFIG: ProdEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  artifactsDir: 'test-artifacts',
  environment: 'prod',
  defaultChainId: 1,
};

export interface CreateMetaMaskMobileE2EContextOptions {
  config?: Partial<Omit<E2EEnvironmentConfig, 'environment'>> & {
    ports?: { anvil?: number; fixtureServer?: number };
  };
  mockServer?: { port?: number; enabled?: boolean };
  getPlatformDriver: () => IPlatformDriver | undefined;
}

export interface CreateMetaMaskMobileProdContextOptions {
  config?: Partial<Omit<ProdEnvironmentConfig, 'environment'>>;
  getPlatformDriver: () => IPlatformDriver | undefined;
}

export function createMetaMaskMobileE2EContext(
  options: CreateMetaMaskMobileE2EContextOptions,
): WorkflowContext {
  const config: E2EEnvironmentConfig = {
    ...DEFAULT_E2E_CONFIG,
    ...options.config,
    environment: 'e2e',
  };

  const anvilPort = config.ports?.anvil ?? 8545;
  const fixturePort = config.ports?.fixtureServer ?? 12345;

  const chain = new MetaMaskMobileChainCapability({
    port: anvilPort,
    chainId: config.defaultChainId,
  });
  const fixture = new MetaMaskMobileFixtureCapability({ port: fixturePort });
  const contractSeeding = new MetaMaskMobileContractSeedingCapability({
    chainCapability: chain,
  });
  const stateSnapshot = new MetaMaskMobileStateSnapshotCapability({
    getPlatformDriver: options.getPlatformDriver,
  });
  const mockServerEnabled = options.mockServer?.enabled !== false;
  const mockServer = mockServerEnabled
    ? new MetaMaskMobileMockServerCapability({
        port: options.mockServer?.port ?? 8000,
      })
    : undefined;

  return {
    fixture,
    chain,
    contractSeeding,
    stateSnapshot,
    ...(mockServer !== undefined ? { mockServer } : {}),
    config,
  };
}

export function createMetaMaskMobileProdContext(
  options: CreateMetaMaskMobileProdContextOptions,
): WorkflowContext {
  const config: ProdEnvironmentConfig = {
    ...DEFAULT_PROD_CONFIG,
    ...options.config,
    environment: 'prod',
  };
  const stateSnapshot = new MetaMaskMobileStateSnapshotCapability({
    getPlatformDriver: options.getPlatformDriver,
  });
  return { stateSnapshot, config };
}
