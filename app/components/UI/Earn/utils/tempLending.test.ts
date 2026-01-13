import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { BigNumber, ethers } from 'ethers';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { LendingProtocol } from '../types/lending.types';
import {
  AAVE_V3_INFINITE_HEALTH_FACTOR,
  AAVE_WITHDRAWAL_RISKS,
  calculateAaveV3HealthFactorAfterWithdrawal,
  CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS,
  generateLendingAllowanceIncreaseTransaction,
  generateLendingDepositTransaction,
  generateLendingWithdrawalTransaction,
  getAaveReceiptTokenBalance,
  getAaveUserAccountData,
  getAaveV3MaxRiskAwareWithdrawalAmount,
  getAaveV3MaxSafeWithdrawal,
  getErc20SpendingLimit,
  getLendingPoolLiquidity,
} from './tempLending';

jest.mock('ethers', () => {
  const mockAllowance = jest.fn();
  const mockContract = jest.fn(() => ({
    allowance: mockAllowance,
    balanceOf: jest.fn(),
    getUserAccountData: jest.fn(),
  }));

  return {
    ...jest.requireActual('ethers'),
    ethers: {
      ...jest.requireActual('ethers').ethers,
      providers: {
        JsonRpcProvider: jest.fn(() => ({})),
      },
      Contract: mockContract,
      utils: {
        ...jest.requireActual('ethers').ethers.utils,
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

    it('handles successful allowance check on BSC network', async () => {
      const expectedAllowance = '3000000';
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        allowance: jest.fn().mockResolvedValue(expectedAllowance),
      }));

      const bscChainId = '0x38';

      const result = await getErc20SpendingLimit(
        mockAccount,
        mockTokenAddress,
        bscChainId,
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

    it('should generate valid deposit transaction parameters for BSC network', () => {
      const bscChainId = '0x38';

      const result = generateLendingDepositTransaction(
        mockMinimalTokenAmount,
        mockActiveAccountAddress,
        mockTokenAddress,
        bscChainId,
      );

      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[bscChainId],
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

    it('should generate valid allowance increase transaction for BSC network', () => {
      const bscChainId = '0x38';

      const result = generateLendingAllowanceIncreaseTransaction(
        mockMinimalTokenAmount,
        mockSenderAddress,
        mockTokenAddress,
        bscChainId,
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

  describe('getLendingPoolLiquidity', () => {
    const mockTokenAddress = '0xdef456';
    const mockReceiptTokenAddress = '0xabc123';
    const mainnetChainId = '0x1';
    const mockBalance = '1000000';

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        balanceOf: jest.fn().mockResolvedValue(mockBalance),
      }));
    });

    it('returns pool liquidity when call succeeds', async () => {
      const result = await getLendingPoolLiquidity(
        mockTokenAddress,
        mockReceiptTokenAddress,
        mainnetChainId,
      );

      expect(result).toBe(mockBalance);
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledTimes(1);
      expect(ethers.Contract).toHaveBeenCalledTimes(1);
    });

    it('returns undefined for unsupported chain', async () => {
      const result = await getLendingPoolLiquidity(
        mockTokenAddress,
        mockReceiptTokenAddress,
        '0x999',
      );

      expect(result).toBeUndefined();
      expect(ethers.providers.JsonRpcProvider).not.toHaveBeenCalled();
    });

    it('returns undefined when balanceOf call fails', async () => {
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        balanceOf: jest.fn().mockRejectedValue(new Error('Failed')),
      }));

      const result = await getLendingPoolLiquidity(
        mockTokenAddress,
        mockReceiptTokenAddress,
        mainnetChainId,
      );

      expect(result).toBeUndefined();
    });

    it('handles successful liquidity check on BSC network', async () => {
      const bscChainId = '0x38';
      const expectedBalance = '2000000';
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        balanceOf: jest.fn().mockResolvedValue(expectedBalance),
      }));

      const result = await getLendingPoolLiquidity(
        mockTokenAddress,
        mockReceiptTokenAddress,
        bscChainId,
      );

      expect(result).toBe(expectedBalance);
    });
  });

  describe('generateLendingWithdrawalTransaction', () => {
    const mockLendingTokenAddress = '0xdef456';
    const mockAmountLowestDenomination = '1000000';
    const mockActiveAccountAddress = '0xabc123';
    const mainnetChainId = '0x1';
    const mockEncodedWithdrawalData = '0x789abc';

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.utils.Interface as unknown as jest.Mock).mockImplementation(
        () => ({
          encodeFunctionData: jest
            .fn()
            .mockReturnValue(mockEncodedWithdrawalData),
        }),
      );
    });

    it('generates valid withdrawal transaction parameters for mainnet', () => {
      const result = generateLendingWithdrawalTransaction(
        mockLendingTokenAddress,
        mockAmountLowestDenomination,
        mockActiveAccountAddress,
        mainnetChainId,
      );

      expect(result).toBeDefined();
      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[mainnetChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedWithdrawalData,
        value: '0',
      });
      expect(result?.txOptions).toEqual({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: 'mainnet',
        origin: ORIGIN_METAMASK,
        type: 'lendingWithdraw',
      });
    });

    it('generates valid withdrawal transaction parameters for Linea network', () => {
      const lineaChainId = '0xe708';

      const result = generateLendingWithdrawalTransaction(
        mockLendingTokenAddress,
        mockAmountLowestDenomination,
        mockActiveAccountAddress,
        lineaChainId,
      );

      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[lineaChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedWithdrawalData,
        value: '0',
      });
      expect(result?.txOptions).toEqual({
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId: expect.any(String),
        origin: ORIGIN_METAMASK,
        type: 'lendingWithdraw',
      });
    });

    it('generates valid withdrawal transaction parameters for Arbitrum network', () => {
      const arbitrumChainId = '0xa4b1';

      const result = generateLendingWithdrawalTransaction(
        mockLendingTokenAddress,
        mockAmountLowestDenomination,
        mockActiveAccountAddress,
        arbitrumChainId,
      );

      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[arbitrumChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedWithdrawalData,
        value: '0',
      });
    });

    it('generates valid withdrawal transaction for BSC network', () => {
      const bscChainId = '0x38';

      const result = generateLendingWithdrawalTransaction(
        mockLendingTokenAddress,
        mockAmountLowestDenomination,
        mockActiveAccountAddress,
        bscChainId,
      );

      expect(result?.txParams).toEqual({
        to: CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[bscChainId],
        from: mockActiveAccountAddress,
        data: mockEncodedWithdrawalData,
        value: '0',
      });
    });
  });

  describe('getAaveV3MaxSafeWithdrawal', () => {
    const mockReceiptToken = {
      chainId: '0x1',
      decimals: 6,
      tokenUsdExchangeRate: 1.0,
      balanceFormatted: '100.0',
      balanceMinimalUnit: '100000000',
      balanceFiat: '$100.00',
      balanceFiatNumber: 100,
      experiences: [],
      symbol: 'aUSDC',
      address: '0xdef456',
      image: '',
      isNative: false,
      ticker: 'aUSDC',
      aggregators: [],
      name: 'Aave USDC',
      balance: '100.0',
      logo: '',
      isETH: false,
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.0',
        estimatedAnnualRewardsFormatted: '5.0',
        estimatedAnnualRewardsFiatNumber: 5,
        estimatedAnnualRewardsTokenMinimalUnit: '5000000',
        estimatedAnnualRewardsTokenFormatted: '5.0',
        market: {
          id: '0xdef456',
          chainId: 1,
          protocol: LendingProtocol.AAVE,
          name: 'USDC Market',
          address: '0xdef456',
          netSupplyRate: 5.0,
          totalSupplyRate: 5.0,
          rewards: [],
          tvlUnderlying: '1000000',
          underlying: {
            address: '0xabc789',
            chainId: 1,
          },
          outputToken: {
            address: '0xdef456',
            chainId: 1,
          },
          position: {
            id: '0xdef456-0xabc789-COLLATERAL-0',
            chainId: 1,
            assets: '1000000',
            marketId: '0xdef456',
            marketAddress: '0xdef456',
            protocol: LendingProtocol.AAVE,
          },
        },
      },
    };

    it('returns undefined when user has no debt', async () => {
      const mockUserDataNoDebt = {
        raw: {
          totalCollateralBase: BigNumber.from('1000000000000000000'),
          totalDebtBase: BigNumber.from('0'),
          availableBorrowsBase: BigNumber.from('300000000000000000'),
          currentLiquidationThreshold: BigNumber.from('8000'),
          ltv: BigNumber.from('7500'),
          healthFactor: BigNumber.from('0'),
        },
        formatted: {
          totalCollateralBase: '10.0',
          totalDebtBase: '0',
          availableBorrowsBase: '3.0',
          liquidationThreshold: '80.00%',
          ltv: '75.00%',
          healthFactor: '0',
        },
      };

      const result = await getAaveV3MaxSafeWithdrawal(
        mockUserDataNoDebt,
        mockReceiptToken,
      );

      // When no debt, can withdraw everything (returns undefined to indicate no limit)
      expect(result).toBeUndefined();
    });

    it('returns "0" when missing chainId', async () => {
      const mockUserData = {
        raw: {
          totalCollateralBase: BigNumber.from('1000000000000000000'),
          totalDebtBase: BigNumber.from('500000000000000000'),
          availableBorrowsBase: BigNumber.from('300000000000000000'),
          currentLiquidationThreshold: BigNumber.from('8000'),
          ltv: BigNumber.from('7500'),
          healthFactor: BigNumber.from('1500000000000000000'),
        },
        formatted: {
          totalCollateralBase: '10.0',
          totalDebtBase: '5.0',
          availableBorrowsBase: '3.0',
          liquidationThreshold: '80.00%',
          ltv: '75.00%',
          healthFactor: '1.5',
        },
      };

      const tokenWithoutChainId = {
        ...mockReceiptToken,
        chainId: undefined,
      };

      const result = await getAaveV3MaxSafeWithdrawal(
        mockUserData,
        tokenWithoutChainId as unknown as typeof mockReceiptToken,
      );

      expect(result).toBe('0');
    });

    it('returns "0" when missing tokenUsdExchangeRate', async () => {
      const mockUserData = {
        raw: {
          totalCollateralBase: BigNumber.from('1000000000000000000'),
          totalDebtBase: BigNumber.from('500000000000000000'),
          availableBorrowsBase: BigNumber.from('300000000000000000'),
          currentLiquidationThreshold: BigNumber.from('8000'),
          ltv: BigNumber.from('7500'),
          healthFactor: BigNumber.from('1500000000000000000'),
        },
        formatted: {
          totalCollateralBase: '10.0',
          totalDebtBase: '5.0',
          availableBorrowsBase: '3.0',
          liquidationThreshold: '80.00%',
          ltv: '75.00%',
          healthFactor: '1.5',
        },
      };

      const tokenWithoutExchangeRate = {
        ...mockReceiptToken,
        tokenUsdExchangeRate: undefined,
      };

      const result = await getAaveV3MaxSafeWithdrawal(
        mockUserData,
        tokenWithoutExchangeRate as unknown as typeof mockReceiptToken,
      );

      expect(result).toBe('0');
    });

    it('returns "0" when current health factor is below minimum', async () => {
      const mockUserDataLowHealth = {
        raw: {
          totalCollateralBase: BigNumber.from('100000000'), // 1 USD (8 decimals)
          totalDebtBase: BigNumber.from('80000000'), // 0.8 USD - results in HF ~1.0
          availableBorrowsBase: BigNumber.from('0'),
          currentLiquidationThreshold: BigNumber.from('8000'), // 80%
          ltv: BigNumber.from('7500'),
          healthFactor: BigNumber.from('1000000000000000000'), // 1.0
        },
        formatted: {
          totalCollateralBase: '1.0',
          totalDebtBase: '0.8',
          availableBorrowsBase: '0',
          liquidationThreshold: '80.00%',
          ltv: '75.00%',
          healthFactor: '1.0',
        },
      };

      const result = await getAaveV3MaxSafeWithdrawal(
        mockUserDataLowHealth,
        mockReceiptToken,
        2.0, // min health factor
      );

      expect(result).toBe('0');
    });

    it('calculates max withdrawal when user has debt and healthy position', async () => {
      const mockUserDataHealthy = {
        raw: {
          totalCollateralBase: BigNumber.from('1000000000'), // 10 USD (8 decimals)
          totalDebtBase: BigNumber.from('200000000'), // 2 USD
          availableBorrowsBase: BigNumber.from('300000000'),
          currentLiquidationThreshold: BigNumber.from('8000'), // 80%
          ltv: BigNumber.from('7500'),
          healthFactor: BigNumber.from('4000000000000000000'), // 4.0
        },
        formatted: {
          totalCollateralBase: '10.0',
          totalDebtBase: '2.0',
          availableBorrowsBase: '3.0',
          liquidationThreshold: '80.00%',
          ltv: '75.00%',
          healthFactor: '4.0',
        },
      };

      const result = await getAaveV3MaxSafeWithdrawal(
        mockUserDataHealthy,
        mockReceiptToken,
        2.0, // min health factor
      );

      // Should return a calculated max withdrawal amount
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getAaveUserAccountData', () => {
    const mockActiveAccountAddress = '0xabc123';
    const mainnetChainId = '0x1';
    const mockUserData = [
      BigNumber.from('1000000000000000000'), // totalCollateralBase
      BigNumber.from('500000000000000000'), // totalDebtBase
      BigNumber.from('300000000000000000'), // availableBorrowsBase
      BigNumber.from('8000'), // currentLiquidationThreshold
      BigNumber.from('7500'), // ltv
      BigNumber.from('1500000000000000000'), // healthFactor
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest.fn().mockResolvedValue(mockUserData),
      }));
    });

    it('returns formatted user account data when call succeeds', async () => {
      const result = await getAaveUserAccountData(
        mockActiveAccountAddress,
        mainnetChainId,
      );

      expect(result).toBeDefined();
      expect(result.formatted).toEqual({
        totalCollateralBase: '10000000000.0',
        totalDebtBase: '5000000000.0',
        availableBorrowsBase: '3000000000.0',
        liquidationThreshold: '80.00%',
        ltv: '75.00%',
        healthFactor: '1.5',
      });
    });

    it('handles infinite health factor when user has no debt', async () => {
      const mockUserDataNoDebt = [
        BigNumber.from('1000000000000000000'), // totalCollateralBase
        BigNumber.from('0'), // totalDebtBase
        BigNumber.from('300000000000000000'), // availableBorrowsBase
        BigNumber.from('8000'), // currentLiquidationThreshold
        BigNumber.from('7500'), // ltv
        BigNumber.from('5'), // healthFactor
      ];

      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest.fn().mockResolvedValue(mockUserDataNoDebt),
      }));

      const result = await getAaveUserAccountData(
        mockActiveAccountAddress,
        mainnetChainId,
      );

      expect(result.formatted.healthFactor).toBe('0.000000000000000005');
    });
  });

  describe('getAaveReceiptTokenBalance', () => {
    const mockReceiptToken = {
      address: '0xdef456',
      chainId: '0x1',
      balanceFormatted: '100.0',
      balanceMinimalUnit: '100000000',
      balanceFiat: '$100.00',
      balanceFiatNumber: 100,
      tokenUsdExchangeRate: 1,
      experiences: [
        {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5.0',
          estimatedAnnualRewardsFormatted: '5.0',
          estimatedAnnualRewardsFiatNumber: 5,
          estimatedAnnualRewardsTokenMinimalUnit: '5000000',
          estimatedAnnualRewardsTokenFormatted: '5.0',
          market: {
            id: '0xdef456',
            chainId: 1,
            protocol: LendingProtocol.AAVE,
            name: 'USDC Market',
            address: '0xdef456',
            netSupplyRate: 5.0,
            totalSupplyRate: 5.0,
            rewards: [],
            tvlUnderlying: '1000000',
            underlying: {
              address: '0xabc789',
              chainId: 1,
            },
            outputToken: {
              address: '0xdef456',
              chainId: 1,
            },
            position: {
              id: '0xdef456-0xabc789-COLLATERAL-0',
              chainId: 1,
              assets: '1000000',
              marketId: '0xdef456',
              marketAddress: '0xdef456',
              protocol: LendingProtocol.AAVE,
            },
          },
        },
      ],
      symbol: 'aUSDC',
      decimals: 6,
      image: 'https://example.com/aUSDC.png',
      isNative: false,
      ticker: 'aUSDC',
      aggregators: [],
      name: 'Aave USDC',
      balance: '100.0',
      logo: 'https://example.com/aUSDC.png',
      isETH: false,
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.0',
        estimatedAnnualRewardsFormatted: '5.0',
        estimatedAnnualRewardsFiatNumber: 5,
        estimatedAnnualRewardsTokenMinimalUnit: '5000000',
        estimatedAnnualRewardsTokenFormatted: '5.0',
        market: {
          id: '0xdef456',
          chainId: 1,
          protocol: LendingProtocol.AAVE,
          name: 'USDC Market',
          address: '0xdef456',
          netSupplyRate: 5.0,
          totalSupplyRate: 5.0,
          rewards: [],
          tvlUnderlying: '1000000',
          underlying: {
            address: '0xabc789',
            chainId: 1,
          },
          outputToken: {
            address: '0xdef456',
            chainId: 1,
          },
          position: {
            id: '0xdef456-0xabc789-COLLATERAL-0',
            chainId: 1,
            assets: '1000000',
            marketId: '0xdef456',
            marketAddress: '0xdef456',
            protocol: LendingProtocol.AAVE,
          },
        },
      },
    };
    const mockActiveAccountAddress = '0xabc123';
    const mockBalance = '1000000';

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        balanceOf: jest.fn().mockResolvedValue(mockBalance),
      }));
    });

    it('returns receipt token balance when call succeeds', async () => {
      const result = await getAaveReceiptTokenBalance(
        mockReceiptToken,
        mockActiveAccountAddress,
      );

      expect(result).toBe(mockBalance);
      expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledTimes(1);
      expect(ethers.Contract).toHaveBeenCalledTimes(1);
    });

    it('returns "0" for unsupported chain', async () => {
      const result = await getAaveReceiptTokenBalance(
        { ...mockReceiptToken, chainId: '0x999' },
        mockActiveAccountAddress,
      );

      expect(result).toBe('0');
      expect(ethers.providers.JsonRpcProvider).not.toHaveBeenCalled();
    });

    it('returns "0" when balanceOf call fails', async () => {
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        balanceOf: jest.fn().mockRejectedValue(new Error('Failed')),
      }));

      const result = await getAaveReceiptTokenBalance(
        mockReceiptToken,
        mockActiveAccountAddress,
      );

      expect(result).toBe('0');
    });
  });

  describe('calculateAaveV3HealthFactorAfterWithdrawal', () => {
    const mockActiveAccountAddress = '0xabc123';
    const mockWithdrawalAmount = '1000000';
    const mockReceiptToken = {
      chainId: '0x1',
      decimals: 18,
      tokenUsdExchangeRate: 1.5,
      balanceFormatted: '100.0',
      balanceMinimalUnit: '100000000',
      balanceFiat: '$100.00',
      balanceFiatNumber: 100,
      experiences: [
        {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5.0',
          estimatedAnnualRewardsFormatted: '5.0',
          estimatedAnnualRewardsFiatNumber: 5,
          estimatedAnnualRewardsTokenMinimalUnit: '5000000',
          estimatedAnnualRewardsTokenFormatted: '5.0',
          market: {
            id: '0xdef456',
            chainId: 1,
            protocol: LendingProtocol.AAVE,
            name: 'USDC Market',
            address: '0xdef456',
            netSupplyRate: 5.0,
            totalSupplyRate: 5.0,
            rewards: [],
            tvlUnderlying: '1000000',
            underlying: {
              address: '0xabc789',
              chainId: 1,
            },
            outputToken: {
              address: '0xdef456',
              chainId: 1,
            },
            position: {
              id: '0xdef456-0xabc789-COLLATERAL-0',
              chainId: 1,
              assets: '1000000',
              marketId: '0xdef456',
              marketAddress: '0xdef456',
              protocol: LendingProtocol.AAVE,
            },
          },
        },
      ],
      symbol: 'aUSDC',
      address: '0xdef456',
      image: 'https://example.com/aUSDC.png',
      isNative: false,
      ticker: 'aUSDC',
      aggregators: [],
      name: 'Aave USDC',
      balance: '100.0',
      logo: 'https://example.com/aUSDC.png',
      isETH: false,
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.0',
        estimatedAnnualRewardsFormatted: '5.0',
        estimatedAnnualRewardsFiatNumber: 5,
        estimatedAnnualRewardsTokenMinimalUnit: '5000000',
        estimatedAnnualRewardsTokenFormatted: '5.0',
        market: {
          id: '0xdef456',
          chainId: 1,
          protocol: LendingProtocol.AAVE,
          name: 'USDC Market',
          address: '0xdef456',
          netSupplyRate: 5.0,
          totalSupplyRate: 5.0,
          rewards: [],
          tvlUnderlying: '1000000',
          underlying: {
            address: '0xabc789',
            chainId: 1,
          },
          outputToken: {
            address: '0xdef456',
            chainId: 1,
          },
          position: {
            id: '0xdef456-0xabc789-COLLATERAL-0',
            chainId: 1,
            assets: '1000000',
            marketId: '0xdef456',
            marketAddress: '0xdef456',
            protocol: LendingProtocol.AAVE,
          },
        },
      },
    };

    const mockUserData = [
      BigNumber.from('1000000000000000000'), // totalCollateralBase
      BigNumber.from('500000000000000000'), // totalDebtBase
      BigNumber.from('300000000000000000'), // availableBorrowsBase
      BigNumber.from('8000'), // currentLiquidationThreshold
      BigNumber.from('7500'), // ltv
      BigNumber.from('1500000000000000000'), // healthFactor
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest.fn().mockResolvedValue(mockUserData),
      }));
    });

    it('calculates health factor after withdrawal when user has debt', async () => {
      const result = await calculateAaveV3HealthFactorAfterWithdrawal(
        mockActiveAccountAddress,
        mockWithdrawalAmount,
        mockReceiptToken,
      );

      expect(result).toBeDefined();
      expect(result.before).toBe('1.5');
      expect(result.after).toBeDefined();
      expect(result.risk).toBeDefined();
    });

    it('handles infinite health factor when user has no debt', async () => {
      const mockUserDataNoDebt = [
        BigNumber.from('1000000000000000000'), // totalCollateralBase
        BigNumber.from('0'), // totalDebtBase
        BigNumber.from('300000000000000000'), // availableBorrowsBase
        BigNumber.from('8000'), // currentLiquidationThreshold
        BigNumber.from('7500'), // ltv
        BigNumber.from('0'), // healthFactor
      ];

      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest.fn().mockResolvedValue(mockUserDataNoDebt),
      }));

      const result = await calculateAaveV3HealthFactorAfterWithdrawal(
        mockActiveAccountAddress,
        mockWithdrawalAmount,
        mockReceiptToken,
      );

      expect(result.before).toBe(AAVE_V3_INFINITE_HEALTH_FACTOR);
      expect(result.after).toBe(AAVE_V3_INFINITE_HEALTH_FACTOR);
      expect(result.risk).toBe(AAVE_WITHDRAWAL_RISKS.LOW);
    });
  });

  describe('getAaveV3MaxRiskAwareWithdrawalAmount', () => {
    const mockActiveAccountAddress = '0xabc123';
    const mockReceiptToken = {
      chainId: '0x1',
      address: '0xdef456',
      balanceMinimalUnit: '1000000',
      balanceFormatted: '100.0',
      balanceFiat: '$100.00',
      balanceFiatNumber: 100,
      tokenUsdExchangeRate: 1,
      experiences: [
        {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '5.0',
          estimatedAnnualRewardsFormatted: '5.0',
          estimatedAnnualRewardsFiatNumber: 5,
          estimatedAnnualRewardsTokenMinimalUnit: '5000000',
          estimatedAnnualRewardsTokenFormatted: '5.0',
          market: {
            id: '0xdef456',
            chainId: 1,
            protocol: LendingProtocol.AAVE,
            name: 'USDC Market',
            address: '0xdef456',
            netSupplyRate: 5.0,
            totalSupplyRate: 5.0,
            rewards: [],
            tvlUnderlying: '1000000',
            underlying: {
              address: '0xabc789',
              chainId: 1,
            },
            outputToken: {
              address: '0xdef456',
              chainId: 1,
            },
            position: {
              id: '0xdef456-0xabc789-COLLATERAL-0',
              chainId: 1,
              assets: '1000000',
              marketId: '0xdef456',
              marketAddress: '0xdef456',
              protocol: LendingProtocol.AAVE,
            },
          },
        },
      ],
      symbol: 'aUSDC',
      decimals: 6,
      image: 'https://example.com/aUSDC.png',
      isNative: false,
      ticker: 'aUSDC',
      aggregators: [],
      name: 'Aave USDC',
      balance: '100.0',
      logo: 'https://example.com/aUSDC.png',
      isETH: false,
      experience: {
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        apr: '5.0',
        estimatedAnnualRewardsFormatted: '5.0',
        estimatedAnnualRewardsFiatNumber: 5,
        estimatedAnnualRewardsTokenMinimalUnit: '5000000',
        estimatedAnnualRewardsTokenFormatted: '5.0',
        market: {
          id: '0xdef456',
          chainId: 1,
          protocol: LendingProtocol.AAVE,
          name: 'USDC Market',
          address: '0xdef456',
          netSupplyRate: 5.0,
          totalSupplyRate: 5.0,
          rewards: [],
          tvlUnderlying: '1000000',
          underlying: {
            address: '0xabc789',
            chainId: 1,
          },
          outputToken: {
            address: '0xdef456',
            chainId: 1,
          },
          position: {
            id: '0xdef456-0xabc789-COLLATERAL-0',
            chainId: 1,
            assets: '1000000',
            marketId: '0xdef456',
            marketAddress: '0xdef456',
            protocol: LendingProtocol.AAVE,
          },
        },
      },
    };

    const mockUserData = [
      BigNumber.from('100000000000'), // totalCollateralBase
      BigNumber.from('500000000'), // totalDebtBase
      BigNumber.from('300000000000000000'), // availableBorrowsBase
      BigNumber.from('8000'), // currentLiquidationThreshold
      BigNumber.from('7500'), // ltv
      BigNumber.from('1500000000000000000'), // healthFactor
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest.fn().mockResolvedValue(mockUserData),
        balanceOf: jest.fn().mockResolvedValue('2000000'),
      }));
    });

    it('returns minimum of pool liquidity, max safe withdrawal, and user balance', async () => {
      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        mockReceiptToken,
      );

      expect(result).toBe('1000000'); // Should be the minimum of the three values
    });

    it('returns undefined when required token data is missing', async () => {
      const invalidToken = {
        chainId: '0x1',
        address: '0xabc789',
        balanceFormatted: '0',
        balanceMinimalUnit: '0',
        balanceFiatNumber: 0,
        tokenUsdExchangeRate: 1,
        experiences: [],
        symbol: 'USDC',
        decimals: 6,
        image: '',
        isNative: false,
        ticker: 'USDC',
        aggregators: [],
        name: 'USDC',
        balance: '0',
        logo: '',
        isETH: false,
        experience: {
          type: EARN_EXPERIENCES.STABLECOIN_LENDING,
          apr: '0',
          estimatedAnnualRewardsFormatted: '0',
          estimatedAnnualRewardsFiatNumber: 0,
          estimatedAnnualRewardsTokenMinimalUnit: '0',
          estimatedAnnualRewardsTokenFormatted: '0',
        },
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        invalidToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when API calls fail', async () => {
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest
          .fn()
          .mockRejectedValue(new Error('Network error')),
        balanceOf: jest.fn().mockResolvedValue('2000000'),
      }));

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when missing experience.market.underlying.address', async () => {
      const tokenWithoutUnderlyingAddress = {
        ...mockReceiptToken,
        experience: {
          ...mockReceiptToken.experience,
          market: {
            ...mockReceiptToken.experience.market,
            underlying: {
              ...mockReceiptToken.experience.market.underlying,
              address: undefined,
            },
          },
        },
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        tokenWithoutUnderlyingAddress as unknown as typeof mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when missing receiptToken.address', async () => {
      const tokenWithoutAddress = {
        ...mockReceiptToken,
        address: undefined,
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        tokenWithoutAddress as unknown as typeof mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when missing receiptToken.chainId', async () => {
      const tokenWithoutChainId = {
        ...mockReceiptToken,
        chainId: undefined,
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        tokenWithoutChainId as unknown as typeof mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when missing receiptToken.balanceMinimalUnit', async () => {
      const tokenWithoutBalance = {
        ...mockReceiptToken,
        balanceMinimalUnit: undefined,
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        tokenWithoutBalance as unknown as typeof mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when missing experience.market', async () => {
      const tokenWithoutMarket = {
        ...mockReceiptToken,
        experience: {
          ...mockReceiptToken.experience,
          market: undefined,
        },
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        tokenWithoutMarket as unknown as typeof mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when getAaveUserAccountData fails', async () => {
      (ethers.Contract as unknown as jest.Mock).mockImplementation(() => ({
        getUserAccountData: jest
          .fn()
          .mockRejectedValue(new Error('User account data error')),
        balanceOf: jest.fn().mockResolvedValue('2000000'),
      }));

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        mockReceiptToken,
      );

      expect(result).toBeUndefined();
    });

    it('handles successful withdrawal amount calculation on BSC network', async () => {
      const bscReceiptToken = {
        ...mockReceiptToken,
        chainId: '0x38',
      };

      const result = await getAaveV3MaxRiskAwareWithdrawalAmount(
        mockActiveAccountAddress,
        bscReceiptToken,
      );

      expect(result).toBe('1000000');
    });
  });
});
