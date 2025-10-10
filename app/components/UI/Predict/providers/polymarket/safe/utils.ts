import { ethers, BigNumber } from 'ethers';
import {
  arrayify,
  hexlify,
  Interface,
  parseUnits,
  splitSignature,
} from 'ethers/lib/utils';
import { multisendAbi, safeAbi, safeFactoryAbi } from './abi';
import {
  OperationType,
  SafeFeeAuthorization,
  SafeTransaction,
  SplitSignature,
} from './types';
import { Hex, numberToHex } from '@metamask/utils';
import {
  CONDITIONAL_TOKEN_DECIMALS,
  MATIC_CONTRACTS,
  POLYGON_MAINNET_CHAIN_ID,
} from '../constants';
import { Signer } from '../../types';
import {
  outcomeTokenSpenders,
  SAFE_FACTORY_ADDRESS,
  SAFE_FACTORY_NAME,
  SAFE_MULTISEND_ADDRESS,
  usdcSpenders,
} from './constants';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';
import Engine from '../../../../../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { isSmartContractAddress } from '../../../../../../util/transactions';
import {
  encodeApprove,
  encodeClaim,
  encodeErc1155Approve,
  getAllowance,
  getContractConfig,
  getIsApprovedForAll,
} from '../utils';
import { PredictPosition } from '../../..';

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

const getTransactionHash = async ({
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
  operation: OperationType;
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
  nonce: bigint;
}): Promise<Hex> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Call the getTransactionHash function on the Safe contract
  const txHash = (await query(ethQuery, 'call', [
    {
      to: safeAddress,
      data: new Interface(safeAbi).encodeFunctionData('getTransactionHash', [
        to,
        value,
        data,
        operation,
        safeTxGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        nonce,
      ]),
    },
  ])) as Hex;

  return txHash;
};

const signSafetransaction = async (
  safeAddress: Hex,
  safeTx: SafeTransaction,
  signer: Signer,
) => {
  const nonce = await getNonce({ safeAddress });

  const txHash = await getTransactionHash({
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
 * Computes the safe address for a given signer
 * @param signer Signer
 * @returns Safe address
 */
export const computeSafeAddress = async (
  ownerAddress: string,
): Promise<Hex> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );
  const res = (await query(ethQuery, 'call', [
    {
      to: SAFE_FACTORY_ADDRESS,
      data: new Interface(safeFactoryAbi).encodeFunctionData(
        'computeProxyAddress',
        [ownerAddress],
      ),
    },
  ])) as Hex;
  const safeAddress = ('0x' + res.slice(-40)) as Hex;
  return safeAddress;
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

export const getDeployProxyWalletTypedData = async () => {
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
}) => {
  try {
    const data = await getDeployProxyWalletTypedData();
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

    return {
      to: SAFE_FACTORY_ADDRESS as Hex,
      data: calldata,
    };
  } catch (error) {
    console.error('Error creating proxy wallet', error);
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

  const txHash = await getTransactionHash({
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
}) => {
  const safeAddress = await computeSafeAddress(signer.address);
  const safeTxn = createAllowancesSafeTransaction();
  const callData = await getSafeTransactionCallData({
    signer,
    safeAddress,
    txn: safeTxn,
  });
  return {
    to: safeAddress as Hex,
    data: callData as Hex,
  };
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

export const createClaimSafeTransaction = (positions: PredictPosition[]) => {
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

  const safeTxn = aggregateTransaction(safeTxns);

  return safeTxn;
};

export const getClaimTransaction = async ({
  signer,
  positions,
  safeAddress,
}: {
  signer: Signer;
  positions: PredictPosition[];
  safeAddress: string;
}) => {
  const safeTxn = createClaimSafeTransaction(positions);
  const callData = await getSafeTransactionCallData({
    signer,
    safeAddress,
    txn: safeTxn,
  });
  return {
    from: signer.address as Hex,
    to: safeAddress as Hex,
    data: callData as Hex,
  };
};
