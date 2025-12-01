import { RewardsIntegrationService } from './RewardsIntegrationService';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accountUtils';
import { formatAccountToCaipAccountId } from '../../utils/rewardsUtils';
import Logger from '../../../../../util/Logger';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { createMockEvmAccount } from '../../__mocks__/serviceMocks';
import type { RewardsController } from '../../../../../core/Engine/controllers/rewards-controller/RewardsController';
import type { NetworkController } from '@metamask/network-controller';
import type { PerpsControllerMessenger } from '../PerpsController';

jest.mock('../../utils/accountUtils');
jest.mock('../../utils/rewardsUtils');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../core/SDKConnect/utils/DevLogger');

describe('RewardsIntegrationService', () => {
  let mockRewardsController: jest.Mocked<RewardsController>;
  let mockNetworkController: jest.Mocked<NetworkController>;
  let mockMessenger: jest.Mocked<PerpsControllerMessenger>;
  const mockEvmAccount = createMockEvmAccount();

  beforeEach(() => {
    mockRewardsController = {
      getPerpsDiscountForAccount: jest.fn(),
    } as unknown as jest.Mocked<RewardsController>;

    mockNetworkController = {
      getNetworkClientById: jest.fn(),
    } as unknown as jest.Mocked<NetworkController>;

    mockMessenger = {
      call: jest.fn(),
    } as unknown as jest.Mocked<PerpsControllerMessenger>;

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

      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockReturnValue({
        configuration: { chainId: '0x1' },
      } as unknown as ReturnType<
        typeof mockNetworkController.getNetworkClientById
      >);
      (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
        mockCaipAccountId,
      );
      mockRewardsController.getPerpsDiscountForAccount.mockResolvedValue(
        mockDiscountBips,
      );

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBe(6500);
      expect(
        mockRewardsController.getPerpsDiscountForAccount,
      ).toHaveBeenCalledWith(mockCaipAccountId);
      expect(DevLogger.log).toHaveBeenCalledWith(
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

      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockReturnValue({
        configuration: { chainId: '0x1' },
      } as unknown as ReturnType<
        typeof mockNetworkController.getNetworkClientById
      >);
      (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
        mockCaipAccountId,
      );
      mockRewardsController.getPerpsDiscountForAccount.mockResolvedValue(0);

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBe(0);
    });

    it('returns undefined when no EVM account found', async () => {
      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        null,
      );

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(DevLogger.log).toHaveBeenCalledWith(
        'RewardsIntegrationService: No EVM account found for fee discount',
      );
      expect(
        mockRewardsController.getPerpsDiscountForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when chain ID not found', async () => {
      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockReturnValue({
        configuration: {},
      } as unknown as ReturnType<
        typeof mockNetworkController.getNetworkClientById
      >);

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          controller: 'RewardsIntegrationService',
          method: 'calculateUserFeeDiscount',
        }),
      );
      expect(
        mockRewardsController.getPerpsDiscountForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when network client not found', async () => {
      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockImplementation(
        () => null as never,
      );

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          method: 'calculateUserFeeDiscount',
          networkClientExists: false,
        }),
      );
    });

    it('returns undefined when CAIP account ID formatting fails', async () => {
      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockReturnValue({
        configuration: { chainId: '0x1' },
      } as unknown as ReturnType<
        typeof mockNetworkController.getNetworkClientById
      >);
      (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(null);

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          controller: 'RewardsIntegrationService',
          method: 'calculateUserFeeDiscount',
          address: mockEvmAccount.address,
          chainId: '0x1',
        }),
      );
      expect(
        mockRewardsController.getPerpsDiscountForAccount,
      ).not.toHaveBeenCalled();
    });

    it('returns undefined when RewardsController throws error', async () => {
      const mockError = new Error('Rewards API error');
      const mockCaipAccountId =
        'eip155:1:0x1234567890abcdef1234567890abcdef12345678';

      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockReturnValue({
        selectedNetworkClientId: 'mainnet',
      });
      mockNetworkController.getNetworkClientById.mockReturnValue({
        configuration: { chainId: '0x1' },
      } as unknown as ReturnType<
        typeof mockNetworkController.getNetworkClientById
      >);
      (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
        mockCaipAccountId,
      );
      mockRewardsController.getPerpsDiscountForAccount.mockRejectedValue(
        mockError,
      );

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          controller: 'RewardsIntegrationService',
          method: 'calculateUserFeeDiscount',
        }),
      );
    });

    it('returns undefined when NetworkController throws error', async () => {
      const mockError = new Error('Network error');

      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        mockEvmAccount,
      );
      (mockMessenger.call as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const result = await RewardsIntegrationService.calculateUserFeeDiscount({
        rewardsController: mockRewardsController,
        networkController: mockNetworkController,
        messenger: mockMessenger,
      });

      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('handles different chain IDs correctly', async () => {
      const chains = [
        { chainId: '0x1', name: 'Mainnet' },
        { chainId: '0x89', name: 'Polygon' },
        { chainId: '0xa4b1', name: 'Arbitrum' },
      ];

      for (const chain of chains) {
        jest.clearAllMocks();

        const mockCaipAccountId = `eip155:${parseInt(chain.chainId, 16)}:${mockEvmAccount.address}`;

        (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
          mockEvmAccount,
        );
        (mockMessenger.call as jest.Mock).mockReturnValue({
          selectedNetworkClientId: chain.name.toLowerCase(),
        });
        mockNetworkController.getNetworkClientById.mockReturnValue({
          configuration: { chainId: chain.chainId },
        } as unknown as ReturnType<
          typeof mockNetworkController.getNetworkClientById
        >);
        (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
          mockCaipAccountId,
        );
        mockRewardsController.getPerpsDiscountForAccount.mockResolvedValue(
          5000,
        );

        const result = await RewardsIntegrationService.calculateUserFeeDiscount(
          {
            rewardsController: mockRewardsController,
            networkController: mockNetworkController,
            messenger: mockMessenger,
          },
        );

        expect(result).toBe(5000);
        expect(formatAccountToCaipAccountId).toHaveBeenCalledWith(
          mockEvmAccount.address,
          chain.chainId,
        );
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

        (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
          mockEvmAccount,
        );
        (mockMessenger.call as jest.Mock).mockReturnValue({
          selectedNetworkClientId: 'mainnet',
        });
        mockNetworkController.getNetworkClientById.mockReturnValue({
          configuration: { chainId: '0x1' },
        } as unknown as ReturnType<
          typeof mockNetworkController.getNetworkClientById
        >);
        (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
          mockCaipAccountId,
        );
        mockRewardsController.getPerpsDiscountForAccount.mockResolvedValue(
          testCase.bips,
        );

        await RewardsIntegrationService.calculateUserFeeDiscount({
          rewardsController: mockRewardsController,
          networkController: mockNetworkController,
          messenger: mockMessenger,
        });

        expect(DevLogger.log).toHaveBeenCalledWith(
          'RewardsIntegrationService: Fee discount calculated',
          expect.objectContaining({
            discountBips: testCase.bips,
            discountPercentage: testCase.percentage,
          }),
        );
      }
    });
  });
});
