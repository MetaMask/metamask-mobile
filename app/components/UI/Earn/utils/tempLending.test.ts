import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import {
  CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS,
  generateLendingAllowanceIncreaseTransaction,
  generateLendingDepositTransaction,
  getErc20SpendingLimit,
} from './tempLending';
import { ethers } from 'ethers';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';

jest.mock('ethers', () => {
  const mockAllowance = jest.fn();
  const mockContract = jest.fn(() => ({
    allowance: mockAllowance,
  }));

  return {
    ethers: {
      providers: {
        JsonRpcProvider: jest.fn(() => ({})),
      },
      Contract: mockContract,
      utils: {
        Interface: jest.fn(() => ({})),
      },
    },
  };
});

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

// Note: Most of the functions in this file will be removed when integrating lending functionality from the earn-controller.
describe('Temp Lending Utils', () => {
  describe('getErc20SpendingLimit', () => {
    const mockAccount = '0xabc123';
    const mockTokenAddress = '0xdef';
    const mainnetChainId = '0x1';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns allowance when call succeeds', async () => {
      const expectedAllowance = '1000000';

      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        allowance: jest.fn().mockResolvedValue(expectedAllowance),
      }));

      const result = await getErc20SpendingLimit(
        mockAccount,
        mockTokenAddress,
        mainnetChainId,
      );

      expect(result).toBe(expectedAllowance);
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledTimes(1);
      expect(ethers.Contract).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for unsupported chain', async () => {
      const result = await getErc20SpendingLimit(
        mockAccount,
        mockTokenAddress,
        '0x999', // unsupported chain
      );

      expect(result).toBeUndefined();
      expect(ethers.providers.JsonRpcProvider).not.toHaveBeenCalled();
    });

    it('returns "0" when allowance call fails', async () => {
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        allowance: jest.fn().mockRejectedValue(new Error('Failed')),
      }));

      const result = await getErc20SpendingLimit(
        mockAccount,
        mockTokenAddress,
        mainnetChainId,
      );

      expect(result).toBe('0');
    });

    it('handles successful allowance check on Base network', async () => {
      const expectedAllowance = '5000000';
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        allowance: jest.fn().mockResolvedValue(expectedAllowance),
      }));

      const baseChainId = '0x2105';

      const result = await getErc20SpendingLimit(
        mockAccount,
        mockTokenAddress,
        baseChainId,
      );

      expect(result).toBe(expectedAllowance);
    });
  });

  describe('generateLendingDepositTransaction', () => {
    const mockMinimalTokenAmount = '1000000';
    const mockActiveAccountAddress = '0xabc123';
    const mockTokenAddress = '0xdef456';
    const mainnetChainId = '0x1';
    const mockEncodedSupplyData = '0x123456';

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.utils.Interface as unknown as jest.Mock).mockImplementation(
        () => ({
          encodeFunctionData: jest.fn().mockReturnValue(mockEncodedSupplyData),
        }),
      );
    });

    it('should generate valid deposit transaction parameters for mainnet', () => {
      const result = generateLendingDepositTransaction(
        mockMinimalTokenAmount,
        mockActiveAccountAddress,
        mockTokenAddress,
        mainnetChainId,
      );

      expect(result).toBeDefined();
      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[mainnetChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedSupplyData,
        value: '0',
      });
      expect(result?.txOptions).toEqual({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: 'mainnet',
        origin: ORIGIN_METAMASK,
        type: 'lendingDeposit',
      });
    });

    it('should generate valid deposit transaction parameters for Base network', () => {
      const baseChainId = '0x2105';

      const result = generateLendingDepositTransaction(
        mockMinimalTokenAmount,
        mockActiveAccountAddress,
        mockTokenAddress,
        baseChainId,
      );

      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[baseChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedSupplyData,
        value: '0',
      });
      expect(result?.txOptions).toEqual({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: expect.any(String),
        origin: ORIGIN_METAMASK,
        type: 'lendingDeposit',
      });
    });

    it('should return undefined for unsupported chain', () => {
      const unsupportedChainId = '0x999';

      const result = generateLendingDepositTransaction(
        mockMinimalTokenAmount,
        mockActiveAccountAddress,
        mockTokenAddress,
        unsupportedChainId,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('generateLendingAllowanceIncreaseTransaction', () => {
    const mockMinimalTokenAmount = '1000000';
    const mockSenderAddress = '0xabc123';
    const mockTokenAddress = '0xdef456';
    const mainnetChainId = '0x1';
    const mockEncodedApprovalData = '0x789abc';

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        interface: {
          encodeFunctionData: jest
            .fn()
            .mockReturnValue(mockEncodedApprovalData),
        },
      }));
    });

    it('should generate valid allowance increase transaction for mainnet', () => {
      const result = generateLendingAllowanceIncreaseTransaction(
        mockMinimalTokenAmount,
        mockSenderAddress,
        mockTokenAddress,
        mainnetChainId,
      );

      expect(result).toBeDefined();
      expect(result?.txParams).toEqual({
        to: mockTokenAddress,
        from: mockSenderAddress,
        data: mockEncodedApprovalData,
        value: '0',
      });
      expect(result?.txOptions).toEqual({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: 'mainnet',
        origin: ORIGIN_METAMASK,
        type: TransactionType.tokenMethodIncreaseAllowance,
      });
    });

    it('should generate valid allowance increase transaction for Base network', () => {
      const baseChainId = '0x2105';

      const result = generateLendingAllowanceIncreaseTransaction(
        mockMinimalTokenAmount,
        mockSenderAddress,
        mockTokenAddress,
        baseChainId,
      );

      expect(result).toBeDefined();
      expect(result?.txParams).toEqual({
        to: mockTokenAddress,
        from: mockSenderAddress,
        data: mockEncodedApprovalData,
        value: '0',
      });
    });

    it('should return undefined for unsupported chain', () => {
      const unsupportedChainId = '0x999';

      const result = generateLendingAllowanceIncreaseTransaction(
        mockMinimalTokenAmount,
        mockSenderAddress,
        mockTokenAddress,
        unsupportedChainId,
      );

      expect(result).toBeUndefined();
    });
  });
});
