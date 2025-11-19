import { DepositService } from './DepositService';
import { createMockHyperLiquidProvider } from '../../__mocks__/providerMocks';
import { createMockEvmAccount } from '../../__mocks__/serviceMocks';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accountUtils';
import { generateTransferData } from '../../../../../util/transactions';
import { generateDepositId } from '../../utils/idUtils';
import { toHex } from '@metamask/controller-utils';
import { parseCaipAssetId } from '@metamask/utils';
import type { IPerpsProvider } from '../types';

jest.mock('../../utils/accountUtils');
jest.mock('../../utils/idUtils');
jest.mock('@metamask/utils');
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
  let mockProvider: jest.Mocked<IPerpsProvider>;
  const mockEvmAccount = createMockEvmAccount();
  const mockDepositId = 'deposit-123';
  const mockTransferData = '0xabcdef';
  const mockBridgeAddress = '0xBridgeContract';
  const mockTokenAddress = '0xTokenAddress';
  const mockAssetId = 'eip155:42161/erc20:0xTokenAddress/default';

  beforeEach(() => {
    mockProvider =
      createMockHyperLiquidProvider() as unknown as jest.Mocked<IPerpsProvider>;

    mockProvider.getDepositRoutes.mockReturnValue([
      {
        assetId: mockAssetId,
        contractAddress: mockBridgeAddress,
        chainId: 'eip155:42161',
      },
    ]);

    (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
      mockEvmAccount,
    );
    (generateDepositId as jest.Mock).mockReturnValue(mockDepositId);
    (generateTransferData as jest.Mock).mockReturnValue(mockTransferData);
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
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result).toEqual({
        transaction: {
          from: mockEvmAccount.address,
          to: mockTokenAddress,
          value: '0x0',
          data: mockTransferData,
          gas: '0x186a0',
        },
        assetChainId: '0xa4b1',
        currentDepositId: mockDepositId,
      });
    });

    it('generates unique deposit ID for tracking', async () => {
      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(generateDepositId).toHaveBeenCalledTimes(1);
    });

    it('retrieves deposit routes from provider', async () => {
      await DepositService.prepareTransaction({
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

      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: mockBridgeAddress,
        amount: '0x0',
      });
    });

    it('generates transfer data for ERC-20 token transfer', async () => {
      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: mockBridgeAddress,
        amount: '0x0',
      });
    });

    it('retrieves EVM account from selected account group', async () => {
      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(getEvmAccountFromSelectedAccountGroup).toHaveBeenCalledTimes(1);
    });

    it('throws error when no EVM account is found', async () => {
      (getEvmAccountFromSelectedAccountGroup as jest.Mock).mockReturnValue(
        null,
      );

      await expect(
        DepositService.prepareTransaction({
          provider: mockProvider,
        }),
      ).rejects.toThrow(
        'No EVM-compatible account found in selected account group',
      );

      expect(parseCaipAssetId).not.toHaveBeenCalled();
    });

    it('parses CAIP asset ID to extract chain and token', async () => {
      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(parseCaipAssetId).toHaveBeenCalledWith(mockAssetId);
    });

    it('converts chain ID to hex format', async () => {
      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(toHex).toHaveBeenCalledWith('42161');
    });

    it('sets fixed gas limit for deposit transaction', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.gas).toBe('0x186a0');
    });

    it('sets transaction value to 0x0', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.value).toBe('0x0');
    });

    it('uses token address as transaction recipient', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.to).toBe(mockTokenAddress);
    });

    it('uses account address as transaction sender', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.from).toBe(mockEvmAccount.address);
    });

    it('includes generated transfer data in transaction', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.transaction.data).toBe(mockTransferData);
    });

    it('returns asset chain ID in hex format', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.assetChainId).toBe('0xa4b1');
    });

    it('returns current deposit ID for tracking', async () => {
      const result = await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(result.currentDepositId).toBe(mockDepositId);
    });

    it('handles different chain IDs correctly', async () => {
      (parseCaipAssetId as jest.Mock).mockReturnValue({
        chainId: 'eip155:1',
        assetReference: mockTokenAddress,
      });

      await DepositService.prepareTransaction({
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

      const result = await DepositService.prepareTransaction({
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

      await DepositService.prepareTransaction({
        provider: mockProvider,
      });

      expect(generateTransferData).toHaveBeenCalledWith('transfer', {
        toAddress: differentBridgeAddress,
        amount: '0x0',
      });
    });
  });
});
