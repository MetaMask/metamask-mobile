import type {
  IPlatformDriver,
  ProdEnvironmentConfig,
  WorkflowContext,
} from '@metamask/client-mcp-core';

import { MetaMaskMobileStateSnapshotCapability } from './state-snapshot';

const DEFAULT_PROD_CONFIG: ProdEnvironmentConfig = {
  extensionName: 'MetaMask',
  defaultPassword: 'correct horse battery staple',
  artifactsDir: 'test-artifacts',
  environment: 'prod',
  defaultChainId: 1,
};

export interface CreateMetaMaskMobileContextOptions {
  config?: Partial<Omit<ProdEnvironmentConfig, 'environment'>>;
  getPlatformDriver: () => IPlatformDriver | undefined;
}

export function createMetaMaskMobileContext(
  options: CreateMetaMaskMobileContextOptions,
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
