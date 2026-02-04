import { DepositService } from './DepositService';
import { createMockHyperLiquidProvider } from '../../__mocks__/providerMocks';
import {
  createMockEvmAccount,
  createMockInfrastructure,
  createMockMessenger,
} from '../../__mocks__/serviceMocks';
import { generateDepositId } from '../../utils/idUtils';
import { toHex } from '@metamask/controller-utils';
import { parseCaipAssetId } from '@metamask/utils';
import { generateTransferData } from '../../../../../util/transactions';
import type { PerpsProvider, PerpsPlatformDependencies } from '../types';
import type { PerpsControllerMessenger } from '../PerpsController';

jest.mock('../../utils/idUtils');
jest.mock('@metamask/utils');
// Mock generateTransferData from util/transactions
jest.mock('../../../../../util/transactions');
jest.mock('@metamask/controller-utils', () => {
  const actual = jest.requireActual('@metamask/controller-utils');
  return {
    ...actual,
    toHex: jest.fn((value: string | number) => {
      if (typeof value === 'number') {
        return `0x${value.toString(16)}`;
      }
      if (typeof value === 'string' && !value.startsWith('0x')) {
        return `0x${parseInt(value, 10).toString(16)}`;
      }
      return value;
    }),
  };
});

describe('DepositService', () => {
  let mockProvider: jest.Mocked<PerpsProvider>;
  let mockDeps: jest.Mocked<PerpsPlatformDependencies>;
  let mockMessenger: jest.Mocked<PerpsControllerMessenger>;
  let service: DepositService;
  const mockEvmAccount = createMockEvmAccount();
  const mockDepositId = 'deposit-123';
  const mockBridgeAddress = '0xBridgeContract';
  const mockTokenAddress = '0xTokenAddress';
  const mockAssetId = 'eip155:42161/erc20:0xTokenAddress/default';

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<PerpsProvider>;

    mockDeps = createMockInfrastructure();
    mockMessenger = createMockMessenger();
    service = new DepositService(mockDeps, mockMessenger);

    mockProvider.getDepositRoutes.mockReturnValue([
      {
        assetId: mockAssetId,
        contractAddress: mockBridgeAddress,
        chainId: 'eip155:42161',
      },
    ]);

    // Setup mock EVM account via messenger
    (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
      if (
        action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
      ) {
        return [mockEvmAccount];
      }
      return undefined;
    });
    (generateDepositId as jest.Mock).mockReturnValue(mockDepositId);
    // Mock generateTransferData to return a valid ERC-20 transfer data
    (generateTransferData as jest.Mock).mockReturnValue(
      '0xa9059cbb000000000000000000000000',
    );
    (parseCaipAssetId as jest.Mock).mockReturnValue({
      chainId: 'eip155:42161',
      assetReference: mockTokenAddress,
    });
    (toHex as jest.Mock).mockImplementation((value: string | number) => {
      if (typeof value === 'number') {
        return `0x${value.toString(16)}`;
      }
      if (typeof value === 'string' && !value.startsWith('0x')) {
        return `0x${parseInt(value, 10).toString(16)}`;
      }
      return value;
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('prepareTransaction', () => {
    it('successfully prepares deposit transaction with all fields', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result).toEqual({
        transaction: {
          from: mockEvmAccount.address,
          to: mockTokenAddress,
          value: '0x0',
          data: expect.stringMatching(/^0xa9059cbb/), // ERC-20 transfer function signature
          gas: '0x186a0',
        },
        assetChainId: '0xa4b1',
        currentDepositId: mockDepositId,
      });
    });

    it('generates unique deposit ID for tracking', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(generateDepositId).toHaveBeenCalledTimes(1);
    });

    it('retrieves deposit routes from provider', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(mockProvider.getDepositRoutes).toHaveBeenCalledWith({
        isTestnet: false,
      });
    });

    it('uses first deposit route from provider', async () => {
      mockProvider.getDepositRoutes.mockReturnValue([
        {
          assetId: mockAssetId,
          contractAddress: mockBridgeAddress,
          chainId: 'eip155:42161',
        },
        {
          assetId: 'eip155:1/erc20:0xOtherToken/default',
          contractAddress: '0xOtherBridge',
          chainId: 'eip155:1',
        },
      ]);

      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      // Verify transfer data is generated with ERC-20 transfer function signature
      expect(result.transaction.data).toMatch(/^0xa9059cbb/);
    });

    it('generates transfer data for ERC-20 token transfer', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      // Verify ERC-20 transfer function signature (0xa9059cbb) is at the start
      expect(result.transaction.data).toMatch(/^0xa9059cbb/);
    });

    it('retrieves EVM account from selected account group via messenger', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      );
    });

    it('throws error when no EVM account is found', async () => {
      (mockMessenger.call as jest.Mock).mockImplementation((action: string) => {
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [];
        }
        return undefined;
      });

      await expect(
        service.prepareTransaction({
          provider: mockProvider,
        }),
      ).rejects.toThrow(
        'No EVM-compatible account found in selected account group',
      );

      expect(parseCaipAssetId).not.toHaveBeenCalled();
    });

    it('parses CAIP asset ID to extract chain and token', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(parseCaipAssetId).toHaveBeenCalledWith(mockAssetId);
    });

    it('converts chain ID to hex format', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(toHex).toHaveBeenCalledWith('42161');
    });

    it('sets fixed gas limit for deposit transaction', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.gas).toBe('0x186a0');
    });

    it('sets transaction value to 0x0', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.value).toBe('0x0');
    });

    it('uses token address as transaction recipient', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.to).toBe(mockTokenAddress);
    });

    it('uses account address as transaction sender', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.from).toBe(mockEvmAccount.address);
    });

    it('includes generated transfer data in transaction', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      // Verify transfer data starts with ERC-20 transfer function signature
      expect(result.transaction.data).toMatch(/^0xa9059cbb/);
    });

    it('returns asset chain ID in hex format', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.assetChainId).toBe('0xa4b1');
    });

    it('returns current deposit ID for tracking', async () => {
      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.currentDepositId).toBe(mockDepositId);
    });

    it('handles different chain IDs correctly', async () => {
      (parseCaipAssetId as jest.Mock).mockReturnValue({
        chainId: 'eip155:1',
        assetReference: mockTokenAddress,
      });

      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(toHex).toHaveBeenCalledWith('1');
    });

    it('handles different token addresses correctly', async () => {
      const differentTokenAddress = '0xDifferentToken';
      (parseCaipAssetId as jest.Mock).mockReturnValue({
        chainId: 'eip155:42161',
        assetReference: differentTokenAddress,
      });

      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.to).toBe(differentTokenAddress);
    });

    it('prepares transaction for different bridge contracts', async () => {
      const differentBridgeAddress = '0xDifferentBridge';
      mockProvider.getDepositRoutes.mockReturnValue([
        {
          assetId: mockAssetId,
          contractAddress: differentBridgeAddress,
          chainId: 'eip155:42161',
        },
      ]);

      const result = await service.prepareTransaction({
        provider: mockProvider,
      });

      // Verify transfer data is generated with ERC-20 transfer function signature
      expect(result.transaction.data).toMatch(/^0xa9059cbb/);
    });

    it('logs debug messages during transaction preparation', async () => {
      await service.prepareTransaction({
        provider: mockProvider,
      });

      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DepositService: Preparing deposit transaction',
      );
      expect(mockDeps.debugLogger.log).toHaveBeenCalledWith(
        'DepositService: Deposit transaction prepared',
        expect.objectContaining({
          depositId: mockDepositId,
          assetChainId: '0xa4b1',
        }),
      );
    });
  });

  describe('instance isolation', () => {
    it('each instance uses its own deps', async () => {
      const mockDeps2 = createMockInfrastructure();
      const mockMessenger2 = createMockMessenger();
      const service2 = new DepositService(mockDeps2, mockMessenger2);

      await service.prepareTransaction({ provider: mockProvider });
      await service2.prepareTransaction({ provider: mockProvider });

      // Each instance should use its own logger
      expect(mockDeps.debugLogger.log).toHaveBeenCalledTimes(2);
      expect(mockDeps2.debugLogger.log).toHaveBeenCalledTimes(2);
    });
  });
});
