import {
  AVAILABLE_CONTRACTS,
  MetaMaskMobileContractSeedingCapability,
} from '../capabilities/seeding';
import type { MetaMaskMobileChainCapability } from '../capabilities/chain';
import { AnvilSeeder } from '../../../tests/seeder/anvil-seeder';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';

jest.mock('@metamask/client-mcp-core', () => ({}));
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
    getContractAddress: jest.MockedFunction<(key: string) => string>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockContractRegistry = {
      getContractAddress: jest.fn((key: string) => `0x${key}Address`),
    };
    mockSeeder = {
      deploySmartContract: jest.fn().mockResolvedValue(undefined),
      getContractRegistry: jest.fn().mockReturnValue(mockContractRegistry),
    } as unknown as jest.Mocked<AnvilSeeder>;
    MockedAnvilSeeder.mockImplementation(() => mockSeeder);
    mockChainCapability = {
      getAnvilManager: jest.fn().mockReturnValue({
        getProvider: jest.fn().mockReturnValue({ chain: 'anvil' }),
      }),
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
      expect(MockedAnvilSeeder).toHaveBeenCalledWith({ chain: 'anvil' });
    });
  });

  describe('deployContract', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('deploys contract with default hardfork', async () => {
      const result = await seedingCapability.deployContract('hst');

      expect(mockSeeder.deploySmartContract).toHaveBeenCalledWith(
        SMART_CONTRACTS.HST,
        'prague',
      );
      expect(result).toMatchObject({ name: 'hst', address: '0xHSTAddress' });
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

    it('throws when seeder not initialized', async () => {
      const uninitializedCapability =
        new MetaMaskMobileContractSeedingCapability({
          chainCapability: mockChainCapability,
        });

      await expect(
        uninitializedCapability.deployContract('hst'),
      ).rejects.toThrow('Seeder not initialized');
    });

    it('throws for unknown contract name', async () => {
      await expect(seedingCapability.deployContract('unknown')).rejects.toThrow(
        'Unknown contract: unknown',
      );
    });
  });

  describe('deployContracts', () => {
    beforeEach(() => {
      seedingCapability.initialize();
    });

    it('deploys multiple contracts', async () => {
      const result = await seedingCapability.deployContracts(['hst', 'nfts']);

      expect(result.deployed).toHaveLength(2);
      expect(result.failed).toEqual([]);
    });

    it('records partial failures', async () => {
      mockSeeder.deploySmartContract.mockResolvedValueOnce(undefined);
      mockSeeder.deploySmartContract.mockRejectedValueOnce(
        new Error('Deployment failed'),
      );

      const result = await seedingCapability.deployContracts(['hst', 'nfts']);

      expect(result.deployed).toHaveLength(1);
      expect(result.failed).toEqual([
        { name: 'nfts', error: 'Deployment failed' },
      ]);
    });
  });

  describe('getContractAddress', () => {
    it('returns address for deployed contract', async () => {
      seedingCapability.initialize();
      await seedingCapability.deployContract('hst');

      const result = seedingCapability.getContractAddress('hst');

      expect(result).toBe('0xHSTAddress');
    });

    it('returns null for missing contract', () => {
      const result = seedingCapability.getContractAddress('hst');

      expect(result).toBeNull();
    });
  });

  describe('listDeployedContracts', () => {
    it('returns deployed contract info', async () => {
      seedingCapability.initialize();
      await seedingCapability.deployContract('hst');

      const result = seedingCapability.listDeployedContracts();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'hst', address: '0xHSTAddress' });
    });
  });

  describe('getAvailableContracts', () => {
    it('returns available contract names', () => {
      const result = seedingCapability.getAvailableContracts();

      expect(result).toEqual([...AVAILABLE_CONTRACTS]);
    });
  });
});
