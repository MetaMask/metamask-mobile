import {
  createMockEvmAccount,
  createMockInfrastructure,
  createMockMessenger,
} from '../../../components/UI/Perps/__mocks__/serviceMocks';
import type { PerpsPlatformDependencies } from '../types';

import { RewardsIntegrationService } from './RewardsIntegrationService';

describe('RewardsIntegrationService', () => {
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let mockMessenger: ReturnType<typeof createMockMessenger>;
  let service: RewardsIntegrationService;
  const mockEvmAccount = createMockEvmAccount();

  /**
   * Helper to set up mockMessenger.call with standard defaults,
   * plus optional overrides for specific actions.
   */
  const setupMessengerDefaults = (overrides: Record<string, unknown> = {}) => {
    (mockMessenger.call as jest.Mock).mockImplementation(
      (action: string, ...args: unknown[]) => {
        if (action in overrides) {
          const val = overrides[action];
          return typeof val === 'function'
            ? (val as (...a: unknown[]) => unknown)(...args)
            : val;
        }
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [mockEvmAccount];
        }
        if (action === 'NetworkController:getState') {
          return { selectedNetworkClientId: 'mainnet' };
        }
        if (action === 'NetworkController:getNetworkClientById') {
          return { configuration: { chainId: '0x1' } };
        }
        return undefined;
      },
    );
  };

  beforeEach(() => {
    mockDeps = createMockInfrastructure();
    mockMessenger = createMockMessenger();
    service = new RewardsIntegrationService(mockDeps, mockMessenger);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateUserFeeDiscount', () => {
    it('calculates fee discount successfully with valid discount', async () => {
      const mockDiscountBips = 6500; // 65%

      setupMessengerDefaults();
      (
        mockDeps.rewards.getPerpsDiscountForAccount as jest.Mock
      ).mockResolvedValue(mockDiscountBips);

      const result = await service.calculateUserFeeDiscount();

      expect(result).toBe(6500);
      expect(mockDeps.rewards.getPerpsDiscountForAccount).toHaveBeenCalledWith(
        expect.stringMatching(/^eip155:1:0x/),
      );
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: Fee discount calculated',
        expect.objectContaining({
          discountBips: 6500,
          discountPercentage: 65,
        }),
      );
    });

    it('returns 0 when no discount available', async () => {
      setupMessengerDefaults();
      (
        mockDeps.rewards.getPerpsDiscountForAccount as jest.Mock
      ).mockResolvedValue(0);

      const result = await service.calculateUserFeeDiscount();

      expect(result).toBe(0);
    });

    it('returns undefined when no EVM account found', async () => {
      setupMessengerDefaults({
        'AccountTreeController:getAccountsFromSelectedAccountGroup': [],
      });

      const result = await service.calculateUserFeeDiscount();

      expect(result).toBeUndefined();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: No EVM account found for fee discount',
      );
      expect(
        mockDeps.rewards.getPerpsDiscountForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when chain ID not found', async () => {
      setupMessengerDefaults({
        'NetworkController:getNetworkClientById': () => {
          throw new Error('Network client not found');
        },
      });

      const result = await service.calculateUserFeeDiscount();

      expect(result).toBeUndefined();
      expect(
        mockDeps.rewards.getPerpsDiscountForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when getFeeDiscount throws error', async () => {
      const mockError = new Error('Rewards API error');

      setupMessengerDefaults();
      (
        mockDeps.rewards.getPerpsDiscountForAccount as jest.Mock
      ).mockRejectedValue(mockError);

      const result = await service.calculateUserFeeDiscount();

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

      setupMessengerDefaults({
        'NetworkController:getState': () => {
          throw mockError;
        },
      });

      const result = await service.calculateUserFeeDiscount();

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
        jest.clearAllMocks();
        mockDeps = createMockInfrastructure();
        mockMessenger = createMockMessenger();
        service = new RewardsIntegrationService(mockDeps, mockMessenger);

        (mockMessenger.call as jest.Mock).mockImplementation(
          (action: string) => {
            if (
              action ===
              'AccountTreeController:getAccountsFromSelectedAccountGroup'
            ) {
              return [mockEvmAccount];
            }
            if (action === 'NetworkController:getState') {
              return { selectedNetworkClientId: chain.name.toLowerCase() };
            }
            if (action === 'NetworkController:getNetworkClientById') {
              return { configuration: { chainId: chain.chainId } };
            }
            return undefined;
          },
        );
        (
          mockDeps.rewards.getPerpsDiscountForAccount as jest.Mock
        ).mockResolvedValue(5000);

        const result = await service.calculateUserFeeDiscount();

        expect(result).toBe(5000);
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

        setupMessengerDefaults();
        (
          mockDeps.rewards.getPerpsDiscountForAccount as jest.Mock
        ).mockResolvedValue(testCase.bips);

        await service.calculateUserFeeDiscount();

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
      const mockMessenger2 = createMockMessenger();
      const service2 = new RewardsIntegrationService(mockDeps2, mockMessenger2);

      // First service - no EVM account
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });
      await service.calculateUserFeeDiscount();

      // Second service - no EVM account
      (mockMessenger2.call as jest.Mock).mockImplementation(
        (action: string) => {
          if (
            action ===
            'AccountTreeController:getAccountsFromSelectedAccountGroup'
          ) {
            return [];
          }
          return undefined;
        },
      );
      await service2.calculateUserFeeDiscount();

      // Each instance should use its own logger
      expect(mockDeps.debugLogger.log).toHaveBeenCalledTimes(1);
      expect(mockDeps2.debugLogger.log).toHaveBeenCalledTimes(1);
    });
  });
});
