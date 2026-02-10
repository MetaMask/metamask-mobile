import type {
  ContractSeedingCapability,
  ContractDeployment,
  ContractInfo,
  DeployOptions,
} from '@metamask/client-mcp-core';
import { AnvilSeeder } from '../../../tests/seeder/anvil-seeder';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import type { MetaMaskMobileChainCapability } from './chain';

/**
 * Available smart contract names for deployment.
 * These contracts are defined in app/util/test/smart-contracts.js
 */
export const AVAILABLE_CONTRACTS = [
  'hst', // ERC-20 token (TST)
  'nfts', // ERC-721 NFT collection
  'erc1155', // ERC-1155 multi-token
  'piggybank', // Simple piggybank contract
  'failing', // Contract that fails on purpose
  'multisig', // Multisig wallet contract
] as const;

export type SmartContractName = (typeof AVAILABLE_CONTRACTS)[number];

export interface MetaMaskContractSeedingCapabilityOptions {
  chainCapability: MetaMaskMobileChainCapability;
}

/**
 * MetaMask Mobile contract seeding capability.
 * Thin wrapper over AnvilSeeder with internal deployment registry.
 */
export class MetaMaskMobileContractSeedingCapability
  implements ContractSeedingCapability
{
  private seeder: AnvilSeeder | undefined;

  private readonly chainCapability: MetaMaskMobileChainCapability;

  private deploymentRegistry: Map<string, ContractDeployment> = new Map();

  constructor(options: MetaMaskContractSeedingCapabilityOptions) {
    this.chainCapability = options.chainCapability;
  }

  /**
   * Initialize the seeder with the Anvil provider.
   * Must be called after chain.start().
   */
  initialize(): void {
    const anvilManager = this.chainCapability.getAnvilManager();
    if (!anvilManager) {
      throw new Error(
        'Chain capability not initialized. Call chain.start() first.',
      );
    }

    const provider = anvilManager.getProvider();
    this.seeder = new AnvilSeeder(provider);
  }

  /**
   * Deploy a single smart contract to Anvil.
   *
   * @param name - Contract name to deploy
   * @param options - Optional deployment options (hardfork, deployer)
   * @returns Deployed contract information
   */
  async deployContract(
    name: string,
    options?: DeployOptions,
  ): Promise<ContractDeployment> {
    if (!this.seeder) {
      throw new Error(
        'Seeder not initialized. Call initialize() after chain.start().',
      );
    }

    if (!AVAILABLE_CONTRACTS.includes(name as SmartContractName)) {
      throw new Error(
        `Unknown contract: ${name}. Available contracts: ${AVAILABLE_CONTRACTS.join(', ')}`,
      );
    }

    // Map contract names to SMART_CONTRACTS constants
    const contractKeyMap: Record<SmartContractName, string> = {
      hst: SMART_CONTRACTS.HST,
      nfts: SMART_CONTRACTS.NFTS,
      erc1155: SMART_CONTRACTS.ERC1155,
      piggybank: SMART_CONTRACTS.PIGGYBANK,
      failing: SMART_CONTRACTS.FAILING,
      multisig: SMART_CONTRACTS.MULTISIG,
    };

    const contractKey = contractKeyMap[name as SmartContractName];
    const hardfork = options?.hardfork ?? 'prague';

    // Deploy contract using AnvilSeeder
    await this.seeder.deploySmartContract(contractKey, hardfork);

    // Get deployed address from seeder's registry
    const address = this.seeder
      .getContractRegistry()
      .getContractAddress(contractKey);

    const deployment: ContractDeployment = {
      name,
      address,
      deployedAt: new Date().toISOString(),
    };

    // Track in internal registry
    this.deploymentRegistry.set(name, deployment);

    return deployment;
  }

  /**
   * Deploy multiple smart contracts in sequence.
   *
   * @param names - Array of contract names to deploy
   * @param options - Optional deployment options
   * @returns Object with deployed and failed contracts
   */
  async deployContracts(
    names: string[],
    options?: DeployOptions,
  ): Promise<{
    deployed: ContractDeployment[];
    failed: { name: string; error: string }[];
  }> {
    if (!this.seeder) {
      throw new Error(
        'Seeder not initialized. Call initialize() after chain.start().',
      );
    }

    const deployed: ContractDeployment[] = [];
    const failed: { name: string; error: string }[] = [];

    for (const name of names) {
      try {
        const contract = await this.deployContract(name, options);
        deployed.push(contract);
      } catch (error) {
        failed.push({
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { deployed, failed };
  }

  /**
   * Get the deployed address of a contract.
   *
   * @param name - Contract name to look up
   * @returns Contract address or null if not deployed
   */
  getContractAddress(name: string): string | null {
    return this.deploymentRegistry.get(name)?.address ?? null;
  }

  /**
   * List all deployed contracts in this session.
   *
   * @returns Array of deployed contract information
   */
  listDeployedContracts(): ContractInfo[] {
    return Array.from(this.deploymentRegistry.values()).map((deployment) => ({
      name: deployment.name,
      address: deployment.address,
      deployedAt: deployment.deployedAt,
    }));
  }

  /**
   * Get list of available contract names that can be deployed.
   *
   * @returns Array of available contract names
   */
  getAvailableContracts(): string[] {
    return [...AVAILABLE_CONTRACTS];
  }

  /**
   * Clear the deployment registry.
   * Called during cleanup.
   */
  clearRegistry(): void {
    this.deploymentRegistry.clear();
  }
}
