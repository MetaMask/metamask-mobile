import { encode, encodePacked } from '@metamask/abi-utils';
import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { BigNumber, ethers } from 'ethers';
import {
  AbiCoder,
  arrayify,
  getCreate2Address,
  hexlify,
  Interface,
  keccak256,
  parseUnits,
  solidityPack,
  splitSignature,
} from 'ethers/lib/utils';
import { PredictPosition } from '../../..';
import { PREDICT_CONSTANTS } from '../../../constants/errors';
import Engine from '../../../../../../core/Engine';
import Logger, { type LoggerErrorOptions } from '../../../../../../util/Logger';
import { isSmartContractAddress } from '../../../../../../util/transactions';
import { Signer } from '../../types';
import {
  COLLATERAL_TOKEN_DECIMALS,
  CONDITIONAL_TOKEN_DECIMALS,
  MATIC_CONTRACTS,
  MIN_COLLATERAL_BALANCE_FOR_CLAIM,
  POLYGON_MAINNET_CHAIN_ID,
} from '../constants';
import {
  encodeApprove,
  encodeClaim,
  encodeErc1155Approve,
  encodeErc20Transfer,
  getAllowance,
  getContractConfig,
  getIsApprovedForAll,
} from '../utils';
import { multisendAbi, safeAbi } from './abi';
import {
  DOMAIN_SEPARATOR_TYPEHASH,
  MASTER_COPY_ADDRESS,
  outcomeTokenSpenders,
  PROXY_CREATION_CODE,
  SAFE_FACTORY_ADDRESS,
  SAFE_FACTORY_NAME,
  SAFE_MULTISEND_ADDRESS,
  SAFE_TX_TYPEHASH,
  usdcSpenders,
} from './constants';
import {
  OperationType,
  SafeFeeAuthorization,
  SafeTransaction,
  SplitSignature,
} from './types';

function joinHexData(hexData: string[]): string {
  return `0x${hexData
    .map((hex) => {
      const stripped = hex.replace(/^0x/, '');
      return stripped.length % 2 === 0 ? stripped : '0' + stripped;
    })
    .join('')}`;
}

function abiEncodePacked(
  ...params: { type: string; value: unknown }[]
): string {
  return joinHexData(
    params.map(({ type, value }) => {
      const encoded = ethers.utils.defaultAbiCoder.encode([type], [value]);

      if (type === 'bytes' || type === 'string') {
        const bytesLength = parseInt(encoded.slice(66, 130), 16);
        return encoded.slice(130, 130 + 2 * bytesLength);
      }

      let typeMatch = /^(?:u?int\d*|bytes\d+|address)\[\]$/.exec(type);
      if (typeMatch) {
        return encoded.slice(130);
      }

      if (type.startsWith('bytes')) {
        const bytesLength = parseInt(type.slice(5));
        return encoded.slice(2, 2 + 2 * bytesLength);
      }

      typeMatch = /^u?int(\d*)$/.exec(type);
      if (typeMatch) {
        if (typeMatch[1] !== '') {
          const bytesLength = parseInt(typeMatch[1]) / 8;
          return encoded.slice(-2 * bytesLength);
        }
        return encoded.slice(-64);
      }

      if (type === 'address') {
        return encoded.slice(-40);
      }

      throw new Error(`unsupported type ${type}`);
    }),
  );
}

const signTransactionHash = async (
  signer: Signer,
  txHash: Hex,
): Promise<SplitSignature> => {
  const messageArray = arrayify(txHash);
  const messageHex = hexlify(messageArray);
  let sig = await signer.signPersonalMessage({
    from: signer.address,
    data: messageHex,
  });
  let sigV = parseInt(sig.slice(-2), 16);

  switch (sigV) {
    case 0:
    case 1:
      sigV += 31;
      break;
    case 27:
    case 28:
      sigV += 4;
      break;
    default:
      throw new Error('Invalid signature');
  }

  sig = sig.slice(0, -2) + sigV.toString(16);

  return {
    r: BigNumber.from('0x' + sig.slice(2, 66)).toString(),
    s: BigNumber.from('0x' + sig.slice(66, 130)).toString(),
    v: BigNumber.from('0x' + sig.slice(130, 132)).toString(),
  };
};

const getNonce = async ({
  safeAddress,
}: {
  safeAddress: string;
}): Promise<bigint> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Call the nonce() function on the Safe contract
  const res = (await query(ethQuery, 'call', [
    {
      to: safeAddress,
      data: new Interface(safeAbi).encodeFunctionData('nonce', []),
    },
  ])) as Hex;

  if (res === '0x') {
    return 0n;
  }

  return BigInt(res);
};

const getTransactionHash = ({
  safeAddress,
  to,
  value,
  data,
  operation,
  safeTxGas = '0',
  baseGas = '0',
  gasPrice = '0',
  gasToken = ethers.constants.AddressZero,
  refundReceiver = ethers.constants.AddressZero,
  nonce,
}: {
  safeAddress: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
  nonce: bigint;
}) => {
  const encoder = new AbiCoder();
  // Step 1: Calculate domain separator
  const domainSeparator = keccak256(
    encoder.encode(
      ['bytes32', 'uint256', 'address'],
      [DOMAIN_SEPARATOR_TYPEHASH, POLYGON_MAINNET_CHAIN_ID, safeAddress],
    ),
  );

  // Step 2: Calculate safe tx hash
  const safeTxHash = keccak256(
    encoder.encode(
      [
        'bytes32',
        'address',
        'uint256',
        'bytes32',
        'uint8',
        'uint256',
        'uint256',
        'uint256',
        'address',
        'address',
        'uint256',
      ],
      [
        SAFE_TX_TYPEHASH,
        to,
        value,
        keccak256(data),
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        nonce,
      ],
    ),
  );

  // Step 3: Encode final transaction data (EIP-712)
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      ['0x19', '0x01', domainSeparator, safeTxHash],
    ),
  ) as Hex;
};

const signSafetransaction = async (
  safeAddress: Hex,
  safeTx: SafeTransaction,
  signer: Signer,
) => {
  const nonce = await getNonce({ safeAddress });

  const txHash = getTransactionHash({
    safeAddress,
    to: safeTx.to,
    value: safeTx.value,
    data: safeTx.data,
    operation: safeTx.operation,
    nonce,
  });

  const rsvSignature = await signTransactionHash(signer, txHash);
  const packedSig = abiEncodePacked(
    { type: 'uint256', value: rsvSignature.r },
    { type: 'uint256', value: rsvSignature.s },
    { type: 'uint8', value: rsvSignature.v },
  );

  return packedSig;
};

/**
 * Creates a SafeFeeAuthorization for a given safe address, signer, amount, and to address
 * @param safeAddress Safe address
 * @param signer Signer
 * @param amount Amount to transfer
 * @param to payee address
 * @returns SafeFeeAuthorization
 */
export const createSafeFeeAuthorization = async ({
  safeAddress,
  signer,
  amount,
  to,
}: {
  safeAddress: Hex;
  signer: Signer;
  amount: bigint;
  to: Hex;
}): Promise<SafeFeeAuthorization> => {
  const erc20transfer = new Interface([
    'function transfer(address to, uint256 amount)',
  ]).encodeFunctionData('transfer', [to, amount]);

  const tx = {
    to: MATIC_CONTRACTS.collateral,
    operation: OperationType.Call,
    data: erc20transfer,
    value: '0',
  };

  const sig = await signSafetransaction(safeAddress, tx, signer);

  return {
    type: 'safe-transaction',
    authorization: {
      tx,
      sig,
    },
  };
};

export const getDeployProxyWalletTypedData = () => {
  const domain = {
    name: SAFE_FACTORY_NAME,
    chainId: numberToHex(POLYGON_MAINNET_CHAIN_ID),
    verifyingContract: SAFE_FACTORY_ADDRESS,
  };

  const types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    CreateProxy: [
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' },
    ],
  };

  const message = {
    paymentToken: ethers.constants.AddressZero,
    payment: '0',
    paymentReceiver: ethers.constants.AddressZero,
  };

  return { domain, types, message, primaryType: 'CreateProxy' };
};

export const encodeCreateProxy = ({
  paymentToken,
  payment,
  paymentReceiver,
  createSig,
}: {
  paymentToken: string;
  payment: bigint | string;
  paymentReceiver: string;
  createSig: { v: number; r: string; s: string };
}): Hex =>
  new Interface([
    'function createProxy(address paymentToken, uint256 payment, address payable paymentReceiver, (uint8 v, bytes32 r, bytes32 s) createSig)',
  ]).encodeFunctionData('createProxy', [
    paymentToken,
    payment,
    paymentReceiver,
    createSig,
  ]) as Hex;

export const getDeployProxyWalletTransaction = async ({
  signer,
}: {
  signer: Signer;
}): Promise<{
  params: { to: Hex; data: Hex };
  type: TransactionType;
}> => {
  const errorContext: LoggerErrorOptions = {
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      provider: 'polymarket',
    },
    context: {
      name: 'safeUtils',
      data: {
        method: 'getDeployProxyWalletTransaction',
      },
    },
  };

  try {
    const data = getDeployProxyWalletTypedData();
    const signature = await signer.signTypedMessage(
      { data, from: signer.address as string },
      SignTypedDataVersion.V4,
    );
    const sig = splitSignature(signature);
    const createSig = {
      v: sig.v,
      r: sig.r,
      s: sig.s,
    };

    const calldata = encodeCreateProxy({
      paymentToken: data.message.paymentToken,
      payment: data.message.payment,
      paymentReceiver: data.message.paymentReceiver,
      createSig,
    });

    // Validate calldata before returning
    if (!calldata || calldata.length < 10) {
      throw new Error(
        'Generated deploy proxy calldata is invalid or too short',
      );
    }

    return {
      params: {
        to: SAFE_FACTORY_ADDRESS as Hex,
        data: calldata,
      },
      type: TransactionType.contractInteraction,
    };
  } catch (error) {
    // Log to Sentry with proxy wallet deployment context (no user address)
    Logger.error(error as Error, errorContext);

    throw new Error(
      `Failed to generate deploy proxy wallet transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const checkProxyWalletDeployed = async ({
  address,
  networkClientId,
}: {
  address: string;
  networkClientId: string;
}) => {
  const isDeployed = await isSmartContractAddress(
    address,
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
    networkClientId,
  );
  return isDeployed;
};

function getHexDataLength(hexData: string): number {
  return Math.ceil(
    (hexData.startsWith('0x') ? hexData.length - 2 : hexData.length) / 2,
  );
}

export const encodeMultisend = ({ txns }: { txns: SafeTransaction[] }): Hex =>
  new Interface(multisendAbi).encodeFunctionData('multiSend', [
    joinHexData(
      txns.map((tx) =>
        abiEncodePacked(
          { type: 'uint8', value: tx.operation },
          { type: 'address', value: tx.to },
          { type: 'uint256', value: tx.value },
          { type: 'uint256', value: getHexDataLength(tx.data) },
          { type: 'bytes', value: tx.data },
        ),
      ),
    ),
  ]) as Hex;

export const createSafeMultisendTransaction = (
  txns: SafeTransaction[],
): SafeTransaction => {
  const data = encodeMultisend({ txns });

  return {
    to: SAFE_MULTISEND_ADDRESS,
    value: '0',
    data,
    operation: OperationType.DelegateCall,
  };
};

export const aggregateTransaction = (
  txns: SafeTransaction[],
): SafeTransaction => {
  let transaction: SafeTransaction;
  if (txns.length === 1) {
    transaction = txns[0];
  } else {
    transaction = createSafeMultisendTransaction(txns);
  }
  return transaction;
};

export const createAllowancesSafeTransaction = () => {
  const safeTxns: SafeTransaction[] = [];

  for (const spender of usdcSpenders) {
    safeTxns.push({
      to: MATIC_CONTRACTS.collateral,
      data: encodeApprove({
        spender,
        amount: ethers.constants.MaxUint256.toBigInt(),
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  for (const spender of outcomeTokenSpenders) {
    safeTxns.push({
      to: MATIC_CONTRACTS.conditionalTokens,
      data: encodeErc1155Approve({ spender, approved: true }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  const safeTxn = aggregateTransaction(safeTxns);

  return safeTxn;
};

export const getSafeTransactionCallData = async ({
  signer,
  safeAddress,
  txn,
  overrides,
}: {
  signer: Signer;
  safeAddress: string;
  txn: SafeTransaction;
  overrides?: ethers.Overrides;
}): Promise<string> => {
  if (overrides == null) {
    overrides = {};
  }

  const nonce = await getNonce({ safeAddress });
  const safeTxGas = '0';
  const baseGas = '0';
  const gasPrice = '0';
  const gasToken = ethers.constants.AddressZero;
  const refundReceiver = ethers.constants.AddressZero;

  const txHash = getTransactionHash({
    safeAddress,
    to: txn.to,
    value: txn.value,
    data: txn.data,
    operation: txn.operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
  });

  const rsvSignature = await signTransactionHash(signer, txHash);

  const packedSig = abiEncodePacked(
    { type: 'uint256', value: rsvSignature.r },
    { type: 'uint256', value: rsvSignature.s },
    { type: 'uint8', value: rsvSignature.v },
  );

  const callData = new Interface(safeAbi).encodeFunctionData(
    'execTransaction',
    [
      txn.to,
      txn.value,
      txn.data,
      txn.operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      packedSig,
    ],
  );

  return callData;
};

export const getProxyWalletAllowancesTransaction = async ({
  signer,
}: {
  signer: Signer;
}): Promise<{
  params: { to: Hex; data: Hex };
  type: TransactionType;
}> => {
  const errorContext: LoggerErrorOptions = {
    tags: {
      feature: PREDICT_CONSTANTS.FEATURE_NAME,
      provider: 'polymarket',
    },
    context: {
      name: 'safeUtils',
      data: {
        method: 'getProxyWalletAllowancesTransaction',
      },
    },
  };

  try {
    const safeAddress = computeProxyAddress(signer.address);
    const safeTxn = createAllowancesSafeTransaction();
    const callData = await getSafeTransactionCallData({
      signer,
      safeAddress,
      txn: safeTxn,
    });

    // Validate callData before returning
    if (!callData || callData.length < 10) {
      throw new Error(
        'Generated allowances calldata is invalid or too short',
      );
    }

    return {
      params: {
        to: safeAddress as Hex,
        data: callData as Hex,
      },
      type: TransactionType.contractInteraction,
    };
  } catch (error) {
    // Log to Sentry with allowances transaction context (no user address)
    Logger.error(error as Error, errorContext);

    throw new Error(
      `Failed to generate proxy wallet allowances transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const hasAllowances = async ({ address }: { address: string }) => {
  const allowanceCalls = [];
  const isApprovedForAllCalls = [];
  for (const spender of usdcSpenders) {
    allowanceCalls.push(
      getAllowance({
        tokenAddress: MATIC_CONTRACTS.collateral,
        owner: address,
        spender,
      }),
    );
  }
  for (const spender of outcomeTokenSpenders) {
    isApprovedForAllCalls.push(
      getIsApprovedForAll({
        owner: address,
        operator: spender,
      }),
    );
  }
  const allowanceResults = await Promise.all(allowanceCalls);
  const isApprovedForAllResults = await Promise.all(isApprovedForAllCalls);
  return (
    allowanceResults.every((allowance) => allowance > 0) &&
    isApprovedForAllResults.every((isApproved) => isApproved)
  );
};

export const createClaimSafeTransaction = (
  positions: PredictPosition[],
  includeTransfer?: {
    address: string;
  },
) => {
  const safeTxns: SafeTransaction[] = [];
  const contractConfig = getContractConfig(POLYGON_MAINNET_CHAIN_ID);

  for (const position of positions) {
    const amounts: bigint[] = [0n, 0n];
    amounts[position.outcomeIndex] = BigInt(
      parseUnits(
        position.size.toString(),
        CONDITIONAL_TOKEN_DECIMALS,
      ).toString(),
    );
    const negRisk = !!position.negRisk;

    const to = (
      negRisk ? contractConfig.negRiskAdapter : contractConfig.conditionalTokens
    ) as Hex;
    const callData = encodeClaim(position.outcomeId, negRisk, amounts);
    safeTxns.push({
      to,
      data: callData,
      operation: OperationType.Call,
      value: '0',
    });
  }

  if (includeTransfer) {
    safeTxns.push({
      to: MATIC_CONTRACTS.collateral,
      data: encodeErc20Transfer({
        to: includeTransfer.address,
        value: parseUnits(
          MIN_COLLATERAL_BALANCE_FOR_CLAIM.toString(),
          COLLATERAL_TOKEN_DECIMALS,
        ).toBigInt(),
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  const safeTxn = aggregateTransaction(safeTxns);

  return safeTxn;
};

export const getClaimTransaction = async ({
  signer,
  positions,
  safeAddress,
  includeTransferTransaction,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
  includeTransferTransaction?: boolean;
}) => {
  const includeTransfer = includeTransferTransaction
    ? { address: signer.address }
    : undefined;
  const safeTxn = createClaimSafeTransaction(positions, includeTransfer);
  const callData = await getSafeTransactionCallData({
    signer,
    safeAddress,
    txn: safeTxn,
  });
  return [
    {
      params: {
        to: safeAddress as Hex,
        data: callData as Hex,
      },
      type: TransactionType.predictClaim,
    },
  ];
};

export const getWithdrawTransactionCallData = async ({
  signer,
  safeAddress,
  data,
}: {
  signer: Signer;
  safeAddress: string;
  data: Hex;
}) => {
  const safeTxn: SafeTransaction = {
    to: MATIC_CONTRACTS.collateral,
    data,
    operation: OperationType.Call,
    value: '0',
  };

  const callData = await getSafeTransactionCallData({
    signer,
    safeAddress,
    txn: safeTxn,
  });

  return callData as Hex;
};

/*
 * Computes the proxy address for a given user address
 * @param userAddress User address
 * @returns Proxy address
 */
export function computeProxyAddress(userAddress: string): Hex {
  const salt = keccak256(encode(['address'], [userAddress]));
  const encodedMasterCopy = encode(['address'], [MASTER_COPY_ADDRESS]);
  const encoded = encodePacked(
    ['bytes', 'bytes'],
    [PROXY_CREATION_CODE, encodedMasterCopy],
  );
  const bytecodeHash = keccak256(encoded);

  const predicted = getCreate2Address(SAFE_FACTORY_ADDRESS, salt, bytecodeHash);
  return predicted as Hex;
}

/**
 * Decodes USDC amount from ERC20 transfer calldata
 * @param data ERC20 transfer calldata (0xa9059cbb...)
 * @returns USDC amount in decimal format (e.g., 1.5 for 1.5 USDC)
 */
export function getSafeUsdcAmount(data: string): number {
  if (!data.startsWith('0xa9059cbb')) {
    throw new Error('Not an ERC20 transfer call');
  }

  // Validate data length
  // Expected format: 0x + selector (8 chars) + address (64 chars) + amount (64 chars) = 138 chars
  const expectedLength = 2 + 8 + 64 + 64;
  if (data.length < expectedLength) {
    throw new Error(
      `Invalid calldata length: expected at least ${expectedLength} characters, got ${data.length}`,
    );
  }

  // Extract amount (last 32 bytes)
  // data format: 0x + selector (8 chars) + address (64 chars) + amount (64 chars)
  // Account for the "0x" prefix (2 chars) in the string position
  const encodedAmount = '0x' + data.slice(2 + 8 + 64, 2 + 8 + 64 + 64);
  let amount: ethers.BigNumber;

  try {
    amount = ethers.BigNumber.from(encodedAmount);
  } catch (e) {
    throw new Error('Invalid encoded amount in calldata');
  }

  // Convert to USDC float
  const usdcValue = parseFloat(ethers.utils.formatUnits(amount, 6));

  // Check for unreasonably large values (likely corrupted data)
  // USDC total supply is ~35 billion, so anything above 100 billion is invalid
  const MAX_REASONABLE_USDC = 1e11; // 100 billion USDC
  if (usdcValue > MAX_REASONABLE_USDC || !isFinite(usdcValue)) {
    throw new Error(
      `Decoded USDC amount is invalid or too large: ${usdcValue}`,
    );
  }

  // Validate non-negative
  if (usdcValue < 0) {
    throw new Error(`Decoded USDC amount is negative: ${usdcValue}`);
  }

  // Round to 6 decimals to match USDC
  return Math.round(usdcValue * 1e6) / 1e6;
}
