import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionParams,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { ethers } from 'ethers';
import Engine from '../../../../core/Engine';

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

  // TODO: Remove type assertion once "lendingDeposit" is available from @metamask/transaction-controller
  const txOptions = getTxOptions(chainId, 'lendingDeposit' as TransactionType);

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
