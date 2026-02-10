import {
  MetaMaskMobileContractSeedingCapability,
  AVAILABLE_CONTRACTS,
} from '../capabilities/seeding';
import { AnvilSeeder } from '../../../tests/seeder/anvil-seeder';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import type { MetaMaskMobileChainCapability } from '../capabilities/chain';

jest.mock('../../../tests/seeder/anvil-seeder');
jest.mock('../../../app/util/test/smart-contracts', () => ({
  SMART_CONTRACTS: {
    HST: 'HST',
    NFTS: 'NFTS',
    ERC1155: 'ERC1155',
    PIGGYBANK: 'PIGGYBANK',
    FAILING: 'FAILING',
    MULTISIG: 'MULTISIG',
  },
}));

const MockedAnvilSeeder = AnvilSeeder as jest.MockedClass<typeof AnvilSeeder>;

describe('MetaMaskMobileContractSeedingCapability', () => {
  let seedingCapability: MetaMaskMobileContractSeedingCapability;
  let mockChainCapability: jest.Mocked<MetaMaskMobileChainCapability>;
  let mockSeeder: jest.Mocked<AnvilSeeder>;
  let mockContractRegistry: {
    getContractAddress: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockContractRegistry = {
      getContractAddress: jest.fn().mockReturnValue('0xContractAddress'),
    };

    mockSeeder = {
      deploySmartContract: jest.fn().mockResolvedValue(undefined),
      getContractRegistry: jest.fn().mockReturnValue(mockContractRegistry),
    } as unknown as jest.Mocked<AnvilSeeder>;

    MockedAnvilSeeder.mockImplementation(() => mockSeeder);

    const mockAnvilManager = {
      getProvider: jest.fn().mockReturnValue({}),
    };

    mockChainCapability = {
      getAnvilManager: jest.fn().mockReturnValue(mockAnvilManager),
    } as unknown as jest.Mocked<MetaMaskMobileChainCapability>;

    seedingCapability = new MetaMaskMobileContractSeedingCapability({
      chainCapability: mockChainCapability,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize', () => {
    it('initializes seeder with Anvil provider', () => {
      seedingCapability.initialize();

      expect(mockChainCapability.getAnvilManager).toHaveBeenCalled();
      expect(MockedAnvilSeeder).toHaveBeenCalledWith({});
    });

    it('throws error when chain capability not initialized', () => {
      mockChainCapability.getAnvilManager = jest.fn().mockReturnValue(null);

      expect(() => seedingCapability.initialize()).toThrow(
        'Chain capability not initialized',
      );
    });
  });

  describe('deployContract', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('deploys HST contract with default hardfork', async () => {
      const result = await seedingCapability.deployContract('hst');

      expect(mockSeeder.deploySmartContract).toHaveBeenCalledWith(
        SMART_CONTRACTS.HST,
        'prague',
      );
      expect(result).toEqual({
        name: 'hst',
        address: '0xContractAddress',
        deployedAt: expect.any(String),
      });
    });

    it('deploys contract with custom hardfork', async () => {
      const result = await seedingCapability.deployContract('nfts', {
        hardfork: 'london',
      });

      expect(mockSeeder.deploySmartContract).toHaveBeenCalledWith(
        SMART_CONTRACTS.NFTS,
        'london',
      );
      expect(result.name).toBe('nfts');
    });

    it('deploys all available contract types', async () => {
      for (const contractName of AVAILABLE_CONTRACTS) {
        await seedingCapability.deployContract(contractName);
      }

      expect(mockSeeder.deploySmartContract).toHaveBeenCalledTimes(
        AVAILABLE_CONTRACTS.length,
      );
    });

    it('throws error when seeder not initialized', async () => {
      const uninitializedCapability =
        new MetaMaskMobileContractSeedingCapability({
          chainCapability: mockChainCapability,
        });

      await expect(
        uninitializedCapability.deployContract('hst'),
      ).rejects.toThrow('Seeder not initialized');
    });

    it('throws error for unknown contract name', async () => {
      await expect(seedingCapability.deployContract('unknown')).rejects.toThrow(
        'Unknown contract: unknown',
      );
    });
  });

  describe('deployContracts', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('deploys multiple contracts successfully', async () => {
      const result = await seedingCapability.deployContracts(['hst', 'nfts']);

      expect(result.deployed).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.deployed[0].name).toBe('hst');
      expect(result.deployed[1].name).toBe('nfts');
    });

    it('handles partial deployment failures', async () => {
      mockSeeder.deploySmartContract = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Deployment failed'));

      const result = await seedingCapability.deployContracts(['hst', 'nfts']);

      expect(result.deployed).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        name: 'nfts',
        error: 'Deployment failed',
      });
    });

    it('throws error when seeder not initialized', async () => {
      const uninitializedCapability =
        new MetaMaskMobileContractSeedingCapability({
          chainCapability: mockChainCapability,
        });

      await expect(
        uninitializedCapability.deployContracts(['hst']),
      ).rejects.toThrow('Seeder not initialized');
    });
  });

  describe('getContractAddress', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('returns deployed contract address', async () => {
      await seedingCapability.deployContract('hst');

      const address = seedingCapability.getContractAddress('hst');

      expect(address).toBe('0xContractAddress');
    });

    it('returns null for non-deployed contract', () => {
      const address = seedingCapability.getContractAddress('nfts');

      expect(address).toBeNull();
    });
  });

  describe('listDeployedContracts', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('returns empty array when no contracts deployed', () => {
      const result = seedingCapability.listDeployedContracts();

      expect(result).toEqual([]);
    });

    it('returns list of deployed contracts', async () => {
      await seedingCapability.deployContract('hst');
      await seedingCapability.deployContract('nfts');

      const result = seedingCapability.listDeployedContracts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('hst');
      expect(result[1].name).toBe('nfts');
    });
  });

  describe('getAvailableContracts', () => {
    it('returns list of available contract names', () => {
      const result = seedingCapability.getAvailableContracts();

      expect(result).toEqual([
        'hst',
        'nfts',
        'erc1155',
        'piggybank',
        'failing',
        'multisig',
      ]);
    });
  });

  describe('clearRegistry', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('clears deployment registry', async () => {
      await seedingCapability.deployContract('hst');
      expect(seedingCapability.listDeployedContracts()).toHaveLength(1);

      seedingCapability.clearRegistry();

      expect(seedingCapability.listDeployedContracts()).toHaveLength(0);
    });
  });
});
