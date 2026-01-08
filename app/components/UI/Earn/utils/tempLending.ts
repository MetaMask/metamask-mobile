import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { ethers, BigNumber as EthersBigNumber } from 'ethers';
import Engine from '../../../../core/Engine';

// TODO: ADD SUPPORT FOR LINEA: Feasibility TBD
// TODO: ADD SUPPORT FOR ARBITRUM: Feasibility TBD
import { EarnTokenDetails } from '../types/lending.types';

const { parseUnits, formatUnits } = ethers.utils;
/**
 * TEMP: This file is only to be used as a stopgap until the same functionality is available from the earn-controller and/or earn-sdk.
 */
const ETH_MAINNET_INFURA_URL = `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
const BASE_INFURA_URL = `https://base-mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
const LINEA_INFURA_URL = `https://linea-mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
const ARBITRUM_INFURA_URL = `https://arbitrum-mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
const BSC_INFURA_URL = `https://bsc-dataseed.bnbchain.org`;

// Minimal ERC20 ABI containing only needed function signatures/
const erc20Abi = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount)',
  'function balanceOf(address account) view returns (uint256)',
];

const aavePoolContractAbi = [
  ...erc20Abi,
  `function getUserAccountData(address user) external view virtual override returns (
    uint256 totalCollateralBase,
    uint256 totalDebtBase,
    uint256 availableBorrowsBase,
    uint256 currentLiquidationThreshold,
    uint256 ltv,
    uint256 healthFactor
)`,
];

const CHAIN_ID_TO_INFURA_URL_MAPPING: Record<string, string> = {
  '0x1': ETH_MAINNET_INFURA_URL,
  '0x2105': BASE_INFURA_URL,
  '0xe708': LINEA_INFURA_URL,
  '0xa4b1': ARBITRUM_INFURA_URL,
  '0x38': BSC_INFURA_URL,
};

const ETHEREUM_MAINNET_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

const BASE_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';

const LINEA_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac';

const SEPOLIA_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951';

const ARBITRUM_ONE_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x794a61358D6845594F94dc1DB02A252b5b4814aD';

const BSC_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x6807dc923806fE8Fd134338EABCA509979a7e0cB';

export const CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS: Record<string, string> =
  {
    '0x1': ETHEREUM_MAINNET_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0x2105': BASE_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0xe708': LINEA_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0xa4b1': ARBITRUM_ONE_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0xaa36a7': SEPOLIA_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0x38': BSC_AAVE_V3_POOL_CONTRACT_ADDRESS,
  };

export const getErc20SpendingLimit = async (
  account: string,
  tokenAddress: string,
  chainId: string,
): Promise<string | undefined> => {
  const infuraUrl = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId];

  if (!infuraUrl) return;

  const spenderAddress = CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[chainId];

  if (!spenderAddress) return;

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const remainingAllowanceLowestDenomination = await tokenContract
    .allowance(account, spenderAddress)
    .catch(() => '0');

  return remainingAllowanceLowestDenomination.toString() ?? '0';
};

const getApprovalEncodedTransactionData = (
  tokenAddress: string,
  minimalTokenAmount: string,
  chainId: string,
) => {
  const infuraUrl = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId];

  if (!infuraUrl) return;

  const spenderAddress = CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[chainId];

  if (!spenderAddress) return;

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  return tokenContract.interface.encodeFunctionData('approve', [
    spenderAddress,
    minimalTokenAmount,
  ]);
};

const generateLendingDepositTxParams = (
  activeAccountAddress: string,
  lendingPoolContractAddress: string,
  encodedDepositTransactionData: string,
): TransactionParams => ({
  to: lendingPoolContractAddress,
  from: activeAccountAddress,
  data: encodedDepositTransactionData,
  value: '0',
});

const generateLendingApprovalTxParams = (
  activeAccountAddress: string,
  tokenAddress: string,
  encodedLendingApprovalTxData: string,
): TransactionParams => ({
  to: tokenAddress,
  from: activeAccountAddress,
  data: encodedLendingApprovalTxData,
  value: '0',
});

const getTxOptions = (chainId: string, transactionType: TransactionType) => {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );

  return {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    networkClientId,
    origin: ORIGIN_METAMASK,
    type: transactionType,
  };
};

const getLendingSupplyEncodedTransactionData = (
  tokenAddress: string,
  minimalTokenAmount: string,
  activeAccountAddress: string,
  referralCode = 0,
) => {
  const aaveV3SupplyAbi = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  ];

  const aaveSupplyInterface = new ethers.utils.Interface(aaveV3SupplyAbi);

  return aaveSupplyInterface.encodeFunctionData('supply', [
    tokenAddress, // address
    minimalTokenAmount, // amount
    activeAccountAddress, // onBehalfOf
    referralCode, // uint16
  ]);
};

export const generateLendingDepositTransaction = (
  minimalTokenAmount: string,
  activeAccountAddress: string,
  tokenAddress: string,
  chainId: string,
) => {
  const encodedSupplyTransactionData = getLendingSupplyEncodedTransactionData(
    tokenAddress,
    minimalTokenAmount,
    activeAccountAddress,
  );

  const lendingPoolContractAddress =
    CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[chainId];

  if (!lendingPoolContractAddress) return;

  const txParams = generateLendingDepositTxParams(
    activeAccountAddress,
    lendingPoolContractAddress,
    encodedSupplyTransactionData,
  );

  const txOptions = getTxOptions(chainId, TransactionType.lendingDeposit);

  return {
    txParams,
    txOptions,
  };
};

export const generateLendingAllowanceIncreaseTransaction = (
  minimalTokenAmount: string,
  senderAddress: string,
  tokenAddress: string,
  chainId: string,
) => {
  const encodedLendingApprovalTransactionData =
    getApprovalEncodedTransactionData(
      tokenAddress,
      minimalTokenAmount,
      chainId,
    );
  if (!encodedLendingApprovalTransactionData) return;

  const txParams = generateLendingApprovalTxParams(
    senderAddress,
    tokenAddress,
    encodedLendingApprovalTransactionData,
  );

  const txOptions = getTxOptions(
    chainId,
    TransactionType.tokenMethodIncreaseAllowance,
  );

  return {
    txParams,
    txOptions,
  };
};

/**
 * returns the lending pool's liquidity in the token's lowest denomination
 */
export const getLendingPoolLiquidity = async (
  tokenAddress: string, // e.g. DAI
  receiptTokenAddress: string, // e.g. ADAI
  chainId: string,
): Promise<string | undefined> => {
  const infuraUrl = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId];

  if (!infuraUrl) return undefined;

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const liquidityLowestDenomination = await tokenContract
    .balanceOf(receiptTokenAddress)
    .catch(() => undefined);

  return liquidityLowestDenomination?.toString() ?? undefined;
};
interface AaveV3UserAccountData {
  raw: {
    totalCollateralBase: ethers.BigNumber;
    totalDebtBase: ethers.BigNumber;
    availableBorrowsBase: ethers.BigNumber;
    currentLiquidationThreshold: ethers.BigNumber;
    ltv: ethers.BigNumber;
    healthFactor: ethers.BigNumber;
  };
  formatted: {
    totalCollateralBase: string;
    totalDebtBase: string;
    availableBorrowsBase: string;
    liquidationThreshold: string;
    ltv: string;
    healthFactor: string;
  };
}

const parseGetUserAccountData = (
  rawUserAccountDataResponse: EthersBigNumber[],
): AaveV3UserAccountData => {
  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = rawUserAccountDataResponse;

  return {
    // BigNumber values for calculations
    raw: {
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    },
    // Formatted values for display
    formatted: {
      totalCollateralBase: formatUnits(totalCollateralBase, 8),
      totalDebtBase: formatUnits(totalDebtBase, 8),
      availableBorrowsBase: formatUnits(availableBorrowsBase, 8),
      // The liquidation threshold is in basis points (10000 = 100%)
      liquidationThreshold:
        (currentLiquidationThreshold.toNumber() / 100).toFixed(2) + '%',
      ltv: (ltv.toNumber() / 100).toFixed(2) + '%',
      // Health factor is in WAD (10^18)
      healthFactor: formatUnits(healthFactor, 18),
    },
  };
};

export const getAaveUserAccountData = async (
  activeAccountAddress: string,
  chainId: string,
) => {
  const infuraUrl = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId];

  const aaveContractAddress =
    CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[chainId];

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(
    aaveContractAddress,
    aavePoolContractAbi,
    provider,
  );

  return parseGetUserAccountData(
    await tokenContract.getUserAccountData(activeAccountAddress),
  );
};

// Might be good for this to be configurable by the user or via remote feature flag eventually.
const DEFAULT_STABLECOIN_SAFE_HEALTH_FACTOR = 2.0;

/**
 * Get the max safe withdraw in the token's lowest denomination.
 * This should be treated as an estimate given variations in exchange rates.
 */
export const getAaveV3MaxSafeWithdrawal = async (
  userData: AaveV3UserAccountData,
  receiptToken: EarnTokenDetails,
  minHealthFactor = DEFAULT_STABLECOIN_SAFE_HEALTH_FACTOR,
) => {
  if (!receiptToken?.chainId || !receiptToken?.tokenUsdExchangeRate) return '0';

  // Correct
  const tokenDecimals = receiptToken.decimals;

  // Asset price in USD with 8 decimals
  const assetPrice = parseUnits(
    receiptToken.tokenUsdExchangeRate.toFixed(8),
    8,
  );

  try {
    // Extract values for calculations
    const {
      totalCollateralBase,
      totalDebtBase,
      currentLiquidationThreshold: liquidationThreshold,
    } = userData.raw;

    // If no debt, can withdraw everything
    if (totalDebtBase.isZero()) {
      return;
    }

    // Calculate current health factor
    const decimalMultiplier = 100; // Use 100 to get 2 decimal places

    // Health factor formula:
    // (Total Collateral in USD x Liquidation Threshold) / (Total Borrows in USD * 10000)
    const currentHealthFactorCalc = totalCollateralBase
      .mul(liquidationThreshold)
      .div(totalDebtBase.mul(10000));

    // Calculate min health factor
    const minHealthFactorWhole = Math.floor(
      minHealthFactor * decimalMultiplier,
    );

    // If current health factor is too low, can't withdraw
    const scaledCurrentHF = currentHealthFactorCalc.mul(decimalMultiplier);
    if (scaledCurrentHF.lt(minHealthFactorWhole)) {
      return '0';
    }

    // Calculate required collateral to maintain min health factor
    // Formula: (Amount Borrowed * Safety Buffer * 100) / (Usable Collateral Percentage / 100)
    const requiredCollateral = totalDebtBase
      .mul(minHealthFactorWhole)
      .mul(10000)
      .div(liquidationThreshold)
      .div(decimalMultiplier);

    // If required collateral exceeds total, can't withdraw
    if (requiredCollateral.gte(totalCollateralBase)) {
      return '0';
    }

    // Calculate max withdrawable in USD (8 decimals)
    const maxWithdrawableUSD = totalCollateralBase.sub(requiredCollateral);

    const maxTokenAmount = maxWithdrawableUSD
      .mul(parseUnits('1', tokenDecimals)) // Convert to token decimals
      .div(assetPrice); // Divide by asset price (8 decimals)

    // maxTokenAmount in lowest denomination
    return maxTokenAmount.toString();
  } catch (e) {
    return '0';
  }
};

const getLendingWithdrawalEncodedTransactionData = (
  lendingTokenAddress: string,
  amountLowestDenomination: string,
  activeAccountAddress: string,
) => {
  const aaveV3WithdrawalAbi = [
    'function withdraw(address asset, uint256 amount, address to) public virtual override returns (uint256)',
  ];

  const aaveSupplyInterface = new ethers.utils.Interface(aaveV3WithdrawalAbi);

  return aaveSupplyInterface.encodeFunctionData('withdraw', [
    lendingTokenAddress,
    amountLowestDenomination,
    activeAccountAddress,
  ]);
};

const generateLendingWithdrawalTxParams = (
  activeAccountAddress: string,
  lendingPoolContractAddress: string,
  encodedDepositTransactionData: string,
): TransactionParams => ({
  to: lendingPoolContractAddress,
  from: activeAccountAddress,
  data: encodedDepositTransactionData,
  value: '0',
});

export const generateLendingWithdrawalTransaction = (
  lendingTokenAddress: string,
  amountLowestDenomination: string,
  activeAccountAddress: string,
  chainId: string,
) => {
  const encodedWithdrawalTransactionData =
    getLendingWithdrawalEncodedTransactionData(
      lendingTokenAddress,
      amountLowestDenomination,
      activeAccountAddress,
    );

  const lendingPoolContractAddress =
    CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS[chainId];

  const txParams = generateLendingWithdrawalTxParams(
    activeAccountAddress,
    lendingPoolContractAddress,
    encodedWithdrawalTransactionData,
  );

  const txOptions = getTxOptions(chainId, TransactionType.lendingWithdraw);

  return {
    txParams,
    txOptions,
  };
};

// Users with no debt are considered to have an infinite health factor.
export const AAVE_V3_INFINITE_HEALTH_FACTOR = 'INFINITE';

export enum AAVE_WITHDRAWAL_RISKS {
  VERY_HIGH = 'VERY_HIGH',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  // Default used in case of failures (e.g. network request fails)
  UNKNOWN = 'UNKNOWN',
}

const getWithdrawalRiskLabel = (
  postWithdrawalHealthFactor: string | ethers.BigNumber,
) => {
  if (postWithdrawalHealthFactor === AAVE_V3_INFINITE_HEALTH_FACTOR)
    return AAVE_WITHDRAWAL_RISKS.LOW;

  const healthFactor = Number(formatUnits(postWithdrawalHealthFactor, 18));

  if (healthFactor >= 2.0) return AAVE_WITHDRAWAL_RISKS.LOW;
  else if (healthFactor >= 1.5) return AAVE_WITHDRAWAL_RISKS.MEDIUM;
  else if (healthFactor >= 1.25) return AAVE_WITHDRAWAL_RISKS.HIGH;
  // Will most likely be auto-reverted by AAVE since resulting Health Factor is below 1
  return AAVE_WITHDRAWAL_RISKS.VERY_HIGH;
};

// TEMP: Debugging tool
export const getAaveReceiptTokenBalance = async (
  receiptToken: EarnTokenDetails,
  activeAccountAddress: string,
) => {
  const infuraUrl =
    CHAIN_ID_TO_INFURA_URL_MAPPING[receiptToken.chainId as string];

  if (!infuraUrl) return '0';

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(
    receiptToken.address,
    erc20Abi,
    provider,
  );

  const aTokenBalance = await tokenContract
    .balanceOf(activeAccountAddress)
    .catch(() => '0');

  return aTokenBalance.toString() ?? '0';
};

export interface SimulatedAaveV3HealthFactorAfterWithdrawal {
  before: string;
  after: string;
  risk: AAVE_WITHDRAWAL_RISKS;
}

/**
 * This is an estimate and should be treated as such.
 * It may differ from AAVE's calculation by 0.1-0.2
 */
export const calculateAaveV3HealthFactorAfterWithdrawal = async (
  activeAccountAddress: string,
  withdrawalAmountTokenMinimalUnit: string | ethers.BigNumber,
  receiptToken: EarnTokenDetails,
): Promise<SimulatedAaveV3HealthFactorAfterWithdrawal> => {
  const result = {
    before: '0',
    after: '0',
    risk: AAVE_WITHDRAWAL_RISKS.UNKNOWN,
  };

  if (!receiptToken?.chainId) return result;

  try {
    const userData = await getAaveUserAccountData(
      activeAccountAddress,
      receiptToken.chainId,
    );

    result.before = userData.formatted.healthFactor;

    const { totalCollateralBase, totalDebtBase, currentLiquidationThreshold } =
      userData.raw;

    // Convert withdrawal amount to BigNumber
    const withdrawalAmountTokenMinimalUnitBN = ethers.BigNumber.from(
      withdrawalAmountTokenMinimalUnit,
    );

    const assetPrice = parseUnits(
      receiptToken.tokenUsdExchangeRate.toFixed(8),
      8,
    );

    // Convert withdrawal amount to USD with 8 decimals: (withdrawalAmountTokenMinimalUnit * assetPrice) / 10^lendingTokenDecimals
    const withdrawalUsdValue = withdrawalAmountTokenMinimalUnitBN
      .mul(assetPrice)
      .div(ethers.BigNumber.from(10).pow(receiptToken.decimals));

    // New collateral after withdrawal
    const newTotalCollateralBase = totalCollateralBase.sub(withdrawalUsdValue);

    // Health factor formula: (collateral * liquidationThreshold) / (debt * 10000)
    // If debt is zero, health factor is "infinite" (return a very large number)
    if (totalDebtBase.isZero()) {
      result.before = AAVE_V3_INFINITE_HEALTH_FACTOR;
      result.after = AAVE_V3_INFINITE_HEALTH_FACTOR;
      result.risk = AAVE_WITHDRAWAL_RISKS.LOW;

      return result;
    }

    const numerator = newTotalCollateralBase.mul(currentLiquidationThreshold);
    const denominator = totalDebtBase.mul(10000);

    // Health factor is a fixed-point number with 18 decimals (WAD)
    const healthFactor = numerator
      .mul(ethers.BigNumber.from(10).pow(18))
      .div(denominator);

    const healthFactorParsed = formatUnits(healthFactor, 18);

    result.after = healthFactorParsed;
    result.risk = getWithdrawalRiskLabel(healthFactor);

    return result;
  } catch (e) {
    console.error(e);
    return result;
  }
};
/**
 * Returns the maximum value a user can withdraw given the following constraints:
 * - Pool has available liquidity
 * - User has receipt (aToken) balance available
 * - User won't accidentally lower their Aave health factor below a threshold (accidental liquidation)
 */
export const getAaveV3MaxRiskAwareWithdrawalAmount = async (
  activeAccountAddress: string,
  receiptToken: EarnTokenDetails,
) => {
  if (
    !receiptToken?.experience?.market?.underlying.address ||
    !receiptToken?.address ||
    !receiptToken?.chainId ||
    !receiptToken?.balanceMinimalUnit
  )
    return undefined;

  try {
    const userData = await getAaveUserAccountData(
      activeAccountAddress,
      receiptToken.chainId,
    );
    const [poolLiquidityInTokens, maxHealthFactorWithdrawalInTokens] =
      await Promise.all([
        getLendingPoolLiquidity(
          receiptToken.experience.market.underlying.address,
          receiptToken.address,
          receiptToken.chainId,
        ),
        getAaveV3MaxSafeWithdrawal(userData, receiptToken as EarnTokenDetails),
      ]);

    const valuesToCompare = [
      poolLiquidityInTokens,
      maxHealthFactorWithdrawalInTokens,
      receiptToken.balanceMinimalUnit,
    ].filter(Boolean) as string[];

    if (valuesToCompare.length === 0) return undefined;

    return BigNumber.min(...valuesToCompare).toString();
  } catch (e) {
    console.error('error getting max risk aware withdrawal amount', e);
    return undefined;
  }
};
