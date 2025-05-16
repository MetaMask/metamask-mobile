import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ethers, BigNumber as EthersBigNumber } from 'ethers';
import Engine from '../../../../core/Engine';
import { EarnTokenDetails } from '../hooks/useEarnTokenDetails';

const { parseUnits, formatUnits } = ethers.utils;
/**
 * TEMP: This file is only to be used as a stopgap until the same functionality is available from the earn-controller and/or earn-sdk.
 */
const ETH_MAINNET_INFURA_URL = `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;
const BASE_INFURA_URL = `https://base-mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;

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
};

const ETHEREUM_MAINNET_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2';

const BASE_AAVE_V3_POOL_CONTRACT_ADDRESS =
  '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';

export const CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS: Record<string, string> =
  {
    '0x1': ETHEREUM_MAINNET_AAVE_V3_POOL_CONTRACT_ADDRESS,
    '0x2105': BASE_AAVE_V3_POOL_CONTRACT_ADDRESS,
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

export const getLendingPoolLiquidity = async (
  tokenAddress: string, // e.g. DAI
  receiptTokenAddress: string, // e.g. ADAI
  chainId: string,
): Promise<string> => {
  console.log('tokenAddress: ', tokenAddress);
  console.log('receiptTokenAddress: ', receiptTokenAddress);
  console.log('chainId: ', chainId);

  const infuraUrl = CHAIN_ID_TO_INFURA_URL_MAPPING[chainId];

  if (!infuraUrl) return '0';

  const provider = new ethers.providers.JsonRpcProvider(infuraUrl);

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  const liquidityLowestDenomination = await tokenContract
    .balanceOf(receiptTokenAddress)
    .catch(() => '0');

  return liquidityLowestDenomination.toString() ?? '0';
};

const parseGetUserAccountData = (
  rawUserAccountDataResponse: EthersBigNumber[],
) => {
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
const DEFAULT_STABLECOIN_SAFE_HEALTH_FACTOR = 1.2;

// Get the max safe withdraw in the token's lowest denomination
export const getAaveV3MaxSafeWithdrawal = async (
  activeAccountAddress: string,
  lendingToken: EarnTokenDetails,
  minHealthFactor = DEFAULT_STABLECOIN_SAFE_HEALTH_FACTOR,
) => {
  if (!lendingToken?.chainId || !lendingToken?.tokenUsdExchangeRate) return '0';

  const tokenDecimals = lendingToken.decimals;

  // Asset price in USD with 8 decimals
  const assetPrice = parseUnits(
    lendingToken.tokenUsdExchangeRate.toFixed(8),
    8,
  );

  try {
    // Get user data
    const userData = await getAaveUserAccountData(
      activeAccountAddress,
      lendingToken.chainId,
    );

    // Extract values for calculations
    const {
      totalCollateralBase,
      totalDebtBase,
      currentLiquidationThreshold: liquidationThreshold,
    } = userData.raw;

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

    // If no debt, can withdraw everything
    if (totalDebtBase.isZero()) {
      // Calculate max withdrawal in token units
      // Convert from USD (8 decimals) to token units (token decimals)
      const maxTokenAmount = totalCollateralBase
        .mul(parseUnits('1', tokenDecimals - 8)) // Scale to token decimals
        .div(assetPrice);

      return maxTokenAmount.toString();
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

  // TODO: Remove type assertion once "lendingDeposit" is available from @metamask/transaction-controller
  const txOptions = getTxOptions(
    chainId,
    'lendingWithdrawal' as TransactionType,
  );

  return {
    txParams,
    txOptions,
  };
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
