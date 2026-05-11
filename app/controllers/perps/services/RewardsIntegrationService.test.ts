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

  describe('getUserHyperliquidBuilderFeeConfig', () => {
    it('returns parsed VIP builder fee config for valid fees', async () => {
      setupMessengerDefaults();
      (
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount as jest.Mock
      ).mockResolvedValue({
        builderCode: '0xe95a5e31904e005066614247d309e00d8ad753aa',
        builderFeeBips: '8',
      });

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toEqual({
        builderAddress: '0xe95a5e31904e005066614247d309e00d8ad753aa',
        builderFeeBips: 8,
      });
      expect(
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount,
      ).toHaveBeenCalledWith(expect.stringMatching(/^eip155:1:0x/));
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: VIP builder fee config resolved',
        expect.objectContaining({
          builderAddress: '0xe95a5e31904e005066614247d309e00d8ad753aa',
          builderFeeBips: 8,
          hasVipBuilderFee: true,
        }),
      );
    });

    it('returns undefined when no VIP fee is available', async () => {
      setupMessengerDefaults();
      (
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
    });

    it('returns undefined for invalid VIP fee data', async () => {
      setupMessengerDefaults();
      (
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount as jest.Mock
      ).mockResolvedValue({
        builderCode: '',
        builderFeeBips: '8',
      });

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
    });

    it('returns undefined when no EVM account found', async () => {
      setupMessengerDefaults({
        'AccountTreeController:getAccountsFromSelectedAccountGroup': [],
      });

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: No EVM account found for VIP builder fees',
      );
      expect(
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when chain ID not found', async () => {
      setupMessengerDefaults({
        'NetworkController:getNetworkClientById': () => {
          throw new Error('Network client not found');
        },
      });

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
      expect(
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when VIP fees lookup throws error', async () => {
      const mockError = new Error('Rewards API error');

      setupMessengerDefaults();
      (
        mockDeps.rewards.getHyperliquidBuilderFeesForAccount as jest.Mock
      ).mockRejectedValue(mockError);

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'RewardsIntegrationService.getUserHyperliquidBuilderFeeConfig',
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

      const result = await service.getUserHyperliquidBuilderFeeConfig();

      expect(result).toBeUndefined();
      expect(mockDeps.logger.error).toHaveBeenCalled();
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
      await service.getUserHyperliquidBuilderFeeConfig();

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
      await service2.getUserHyperliquidBuilderFeeConfig();

      // Each instance should use its own logger
      expect(mockDeps.debugLogger.log).toHaveBeenCalledTimes(1);
      expect(mockDeps2.debugLogger.log).toHaveBeenCalledTimes(1);
    });
  });
});
