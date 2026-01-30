import { RewardsIntegrationService } from './RewardsIntegrationService';
import {
  createMockEvmAccount,
  createMockInfrastructure,
} from '../../__mocks__/serviceMocks';
import type { PerpsControllerMessenger } from '../PerpsController';
import type {
  PerpsPlatformDependencies,
  PerpsControllerAccess,
} from '../types';

// Helper to get rewards mock with type safety
const getRewardsMock = (controllers: jest.Mocked<PerpsControllerAccess>) => {
  if (!controllers.rewards) {
    throw new Error('rewards mock not set up');
  }
  return controllers.rewards;
};

describe('RewardsIntegrationService', () => {
  let mockControllers: jest.Mocked<PerpsControllerAccess>;
  let mockMessenger: jest.Mocked<PerpsControllerMessenger>;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let service: RewardsIntegrationService;
  const mockEvmAccount = createMockEvmAccount();

  beforeEach(() => {
    mockControllers = {
      accounts: {
        getSelectedEvmAccount: jest.fn(),
        formatAccountToCaipId: jest.fn(),
      },
      keyring: {
        signTypedMessage: jest.fn(),
      },
      network: {
        getChainIdForNetwork: jest.fn(),
        findNetworkClientIdForChain: jest.fn(),
      },
      transaction: {
        submit: jest.fn(),
      },
      rewards: {
        getFeeDiscount: jest.fn(),
      },
      authentication: {
        getBearerToken: jest.fn(),
      },
    } as unknown as jest.Mocked<PerpsControllerAccess>;

    mockMessenger = {
      call: jest.fn(),
    } as unknown as jest.Mocked<PerpsControllerMessenger>;

    mockDeps = createMockInfrastructure();
    service = new RewardsIntegrationService(mockDeps);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateUserFeeDiscount', () => {
    it('calculates fee discount successfully with valid discount', async () => {
      const mockDiscountBips = 6500; // 65%
      const mockCaipAccountId =
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678';

      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (
        mockControllers.accounts.formatAccountToCaipId as jest.Mock
      ).mockReturnValue(mockCaipAccountId);
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      (
        mockControllers.network.getChainIdForNetwork as jest.Mock
      ).mockReturnValue('0x1');
      (
        getRewardsMock(mockControllers).getFeeDiscount as jest.Mock
      ).mockResolvedValue(mockDiscountBips);

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBe(6500);
      expect(
        getRewardsMock(mockControllers).getFeeDiscount,
      ).toHaveBeenCalledWith(mockCaipAccountId);
      expect(
        mockControllers.accounts.formatAccountToCaipId,
      ).toHaveBeenCalledWith(mockEvmAccount.address, '0x1');
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: Fee discount calculated',
        expect.objectContaining({
          discountBips: 6500,
          discountPercentage: 65,
        }),
      );
    });

    it('returns undefined when no discount available', async () => {
      const mockCaipAccountId =
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678';

      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      (
        mockControllers.network.getChainIdForNetwork as jest.Mock
      ).mockReturnValue('0x1');
      (
        mockControllers.accounts.formatAccountToCaipId as jest.Mock
      ).mockReturnValue(mockCaipAccountId);
      (
        getRewardsMock(mockControllers).getFeeDiscount as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBe(0);
    });

    it('returns undefined when no EVM account found', async () => {
      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(null);

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: No EVM account found for fee discount',
      );
      expect(
        getRewardsMock(mockControllers).getFeeDiscount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when chain ID not found', async () => {
      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      (
        mockControllers.network.getChainIdForNetwork as jest.Mock
      ).mockImplementation(() => {
        throw new Error('Network client not found');
      });

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'RewardsIntegrationService.calculateUserFeeDiscount',
          }),
        }),
      );
      expect(
        getRewardsMock(mockControllers).getFeeDiscount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when CAIP account ID formatting fails', async () => {
      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      (
        mockControllers.network.getChainIdForNetwork as jest.Mock
      ).mockReturnValue('0x1');
      (
        mockControllers.accounts.formatAccountToCaipId as jest.Mock
      ).mockReturnValue(null);

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'RewardsIntegrationService.calculateUserFeeDiscount',
            data: expect.objectContaining({
              address: mockEvmAccount.address,
              chainId: '0x1',
            }),
          }),
        }),
      );
      expect(
        getRewardsMock(mockControllers).getFeeDiscount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when getFeeDiscount throws error', async () => {
      const mockError = new Error('Rewards API error');
      const mockCaipAccountId =
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678';

      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      (
        mockControllers.network.getChainIdForNetwork as jest.Mock
      ).mockReturnValue('0x1');
      (
        mockControllers.accounts.formatAccountToCaipId as jest.Mock
      ).mockReturnValue(mockCaipAccountId);
      (
        getRewardsMock(mockControllers).getFeeDiscount as jest.Mock
      ).mockRejectedValue(mockError);

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'RewardsIntegrationService.calculateUserFeeDiscount',
          }),
        }),
      );
    });

    it('returns undefined when NetworkController throws error', async () => {
      const mockError = new Error('Network error');

      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(mockEvmAccount);
      (mockMessenger.call as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalled();
    });

    it('handles different chain IDs correctly', async () => {
      const chains = [
        { chainId: '0x1', name: 'Mainnet' },
        { chainId: '0x89', name: 'Polygon' },
        { chainId: '0xa4b1', name: 'Arbitrum' },
      ];

      for (const chain of chains) {
        // Reset only specific mocks, keeping mockDeps intact
        jest.clearAllMocks();
        mockDeps = createMockInfrastructure();
        service = new RewardsIntegrationService(mockDeps);

        const mockCaipAccountId = `eip155:${parseInt(chain.chainId, 16)}:${mockEvmAccount.address}`;

        // Mock the passed mockControllers.accounts methods
        (
          mockControllers.accounts.getSelectedEvmAccount as jest.Mock
        ).mockReturnValue(mockEvmAccount);
        (
          mockControllers.accounts.formatAccountToCaipId as jest.Mock
        ).mockReturnValue(mockCaipAccountId);

        (mockMessenger.call as jest.Mock).mockReturnValue({
          selectedNetworkClientId: chain.name.toLowerCase(),
        });
        (
          mockControllers.network.getChainIdForNetwork as jest.Mock
        ).mockReturnValue(chain.chainId as `0x${string}`);
        (
          getRewardsMock(mockControllers).getFeeDiscount as jest.Mock
        ).mockResolvedValue(5000);

        const result = await service.calculateUserFeeDiscount({
          controllers: mockControllers,
          messenger: mockMessenger,
        });

        expect(result).toBe(5000);
        expect(
          mockControllers.accounts.formatAccountToCaipId,
        ).toHaveBeenCalledWith(mockEvmAccount.address, chain.chainId);
      }
    });

    it('calculates discount percentage correctly in logs', async () => {
      const testCases = [
        { bips: 6500, percentage: 65 },
        { bips: 5000, percentage: 50 },
        { bips: 2500, percentage: 25 },
        { bips: 1000, percentage: 10 },
        { bips: 0, percentage: 0 },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const mockCaipAccountId =
          'eip155:1:0x1234567890abcdef1234567890abcdef12345678';

        (
          mockControllers.accounts.getSelectedEvmAccount as jest.Mock
        ).mockReturnValue(mockEvmAccount);
        (mockMessenger.call as jest.Mock).mockReturnValue({
          selectedNetworkClientId: 'mainnet',
        });
        (
          mockControllers.network.getChainIdForNetwork as jest.Mock
        ).mockReturnValue('0x1');
        (
          mockControllers.accounts.formatAccountToCaipId as jest.Mock
        ).mockReturnValue(mockCaipAccountId);
        (
          getRewardsMock(mockControllers).getFeeDiscount as jest.Mock
        ).mockResolvedValue(testCase.bips);

        await service.calculateUserFeeDiscount({
          controllers: mockControllers,
          messenger: mockMessenger,
        });

        expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
          'RewardsIntegrationService: Fee discount calculated',
          expect.objectContaining({
            discountBips: testCase.bips,
            discountPercentage: testCase.percentage,
          }),
        );
      }
    });
  });

  describe('instance isolation', () => {
    it('each instance uses its own deps', async () => {
      const mockDeps2 = createMockInfrastructure();
      const service2 = new RewardsIntegrationService(mockDeps2);

      // First service - mock the passed controllers
      (
        mockControllers.accounts.getSelectedEvmAccount as jest.Mock
      ).mockReturnValue(null);
      await service.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      // Second service - uses same mockControllers but different mockDeps
      await service2.calculateUserFeeDiscount({
        controllers: mockControllers,
        messenger: mockMessenger,
      });

      // Each instance should use its own logger
      expect(mockDeps.debugLogger.log).toHaveBeenCalledTimes(1);
      expect(mockDeps2.debugLogger.log).toHaveBeenCalledTimes(1);
    });
  });
});
