import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { Hex, numberToHex } from '@metamask/utils';
import { BigNumber, ethers } from 'ethers';
import {
  arrayify,
  defaultAbiCoder,
  hexlify,
  Interface,
} from 'ethers/lib/utils';
import Engine from '../../../../../core/Engine';
import { MATIC_CONTRACTS, POLYGON_MAINNET_CHAIN_ID } from './constants';
import { encodeApprove, encodeErc1155Approve } from './utils';

export const SAFE_FACTORY_NAME = 'Polymarket Contract Proxy Factory';

export const SAFE_FACTORY_ADDRESS =
  '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b';

export const SAFE_MULTISEND_ADDRESS =
  '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

export enum OperationType {
  Call, // 0
  DelegateCall, // 1
}

export interface SafeTransaction {
  to: string;
  operation: OperationType;
  data: string;
  value: string;
}

interface SplitSignature {
  r: string;
  s: string;
  v: string;
}

export const safeAbi = [
  {
    inputs: [],
    name: 'nonce',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
      {
        internalType: 'enum Enum.Operation',
        name: 'operation',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'safeTxGas',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'baseGas',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'gasPrice',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'gasToken',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'refundReceiver',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_nonce',
        type: 'uint256',
      },
    ],
    name: 'getTransactionHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
      {
        internalType: 'enum Enum.Operation',
        name: 'operation',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'safeTxGas',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'baseGas',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'gasPrice',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'gasToken',
        type: 'address',
      },
      {
        internalType: 'address payable',
        name: 'refundReceiver',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'signatures',
        type: 'bytes',
      },
    ],
    name: 'execTransaction',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

const usdcSpenders = [
  '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045', // Conditional Tokens Framework
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // CTF Exchange
  '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk CTF Exchange
];

const outcomeTokenSpenders = [
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // CTF Exchange
  '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk Exchange
];

export const multisendAbi = [
  {
    constant: false,
    inputs: [
      {
        internalType: 'bytes',
        name: 'transactions',
        type: 'bytes',
      },
    ],
    name: 'multiSend',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

function joinHexData(hexData: string[]): string {
  return `0x${hexData
    .map((hex) => {
      const stripped = hex.replace(/^0x/, '');
      return stripped.length % 2 === 0 ? stripped : '0' + stripped;
    })
    .join('')}`;
}

function abiEncodePacked(...params: { type: string; value: any }[]): string {
  return joinHexData(
    params.map(({ type, value }) => {
      const encoded = ethers.utils.defaultAbiCoder.encode([type], [value]);

      if (type === 'bytes' || type === 'string') {
        const bytesLength = parseInt(encoded.slice(66, 130), 16);
        return encoded.slice(130, 130 + 2 * bytesLength);
      }

      let typeMatch = type.match(/^(?:u?int\d*|bytes\d+|address)\[\]$/);
      if (typeMatch) {
        return encoded.slice(130);
      }

      if (type.startsWith('bytes')) {
        const bytesLength = parseInt(type.slice(5));
        return encoded.slice(2, 2 + 2 * bytesLength);
      }

      typeMatch = type.match(/^u?int(\d*)$/);
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

export const encodeMultisend = ({
  transactions,
}: {
  transactions: string;
}): Hex =>
  new Interface(multisendAbi).encodeFunctionData('multiSend', [
    transactions,
  ]) as Hex;

/**
 * Pack a Safe transaction for multisend encoding
 * @param operation - Operation type (0 = Call, 1 = DelegateCall)
 * @param to - Target address
 * @param value - Value in wei as hex string
 * @param data - Transaction data as hex string
 * @returns Packed transaction data as hex string
 */
export const packMultisendTransaction = ({
  operation,
  to,
  value,
  data,
}: {
  operation: number;
  to: string;
  value: string;
  data: string;
}): string => {
  // Encode each field separately and concatenate (equivalent to abi.encodePacked)
  const operationEncoded = defaultAbiCoder.encode(['uint8'], [operation]);
  const toEncoded = defaultAbiCoder.encode(['address'], [to]);
  const valueEncoded = defaultAbiCoder.encode(['uint256'], [value]);
  const dataLengthEncoded = defaultAbiCoder.encode(
    ['uint256'],
    [(data.length - 2) / 2],
  ); // Length in bytes (remove 0x prefix)

  // Remove 0x prefix from data
  const dataWithoutPrefix = data.startsWith('0x') ? data.slice(2) : data;

  // Concatenate all encoded parts (remove 0x from encoded parts)
  return (
    operationEncoded.slice(2) +
    toEncoded.slice(2) +
    valueEncoded.slice(2) +
    dataLengthEncoded.slice(2) +
    dataWithoutPrefix
  );
};

/**
 * Pack multiple Safe transactions for multisend
 * @param transactions - Array of Safe transactions
 * @returns Packed transactions data as hex string
 */
export const packMultisendTransactions = (
  transactions: {
    operation: number;
    to: string;
    value: string;
    data: string;
  }[],
): string => {
  const packedTransactions = transactions
    .map(packMultisendTransaction)
    .join('');
  return '0x' + packedTransactions;
};

export const encodeComputeProxyAddress = ({ user }: { user: string }): Hex =>
  new Interface([
    'function computeProxyAddress(address user) view returns (address)',
  ]).encodeFunctionData('computeProxyAddress', [user]) as Hex;

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

export const getCreateSafeCreateTypedData = async () => {
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

export const createSafeMultisendTransaction = (
  txns: SafeTransaction[],
): SafeTransaction => {
  const packedTransactions = packMultisendTransactions(txns);
  const data = encodeMultisend({ transactions: packedTransactions });

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

  const safeTxn = aggregateTransaction(safeTxns.slice(0, 1));

  return safeTxn;
};

export const getNonce = async ({
  safeAddress,
}: {
  safeAddress: string;
}): Promise<string> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Call the nonce() function on the Safe contract
  const nonce = await query(ethQuery, 'call', [
    {
      to: safeAddress,
      data: new Interface(safeAbi).encodeFunctionData('nonce', []),
    },
  ]);

  // Convert the hex result to a decimal string
  return parseInt(nonce, 16).toString();
};

export const getTransactionHash = async ({
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
  nonce: string;
}): Promise<string> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  // Call the getTransactionHash function on the Safe contract
  const txHash = await query(ethQuery, 'call', [
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
  ]);

  // Return the bytes32 hash as a hex string
  return txHash;
};

async function signTransactionHash({
  signMessage,
  signerAddress,
  message,
}: {
  signMessage: (params: { data: string; from: string }) => Promise<string>;
  signerAddress: string;
  message: string;
}): Promise<SplitSignature> {
  const messageArray = arrayify(message);
  const messageHex = hexlify(messageArray);
  let sig = await signMessage({ data: messageHex, from: signerAddress });
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
}

export const getSafeTransactionCallData = async ({
  signMessage,
  signerAddress,
  safeAddress,
  txn,
  overrides,
}: {
  signMessage: (params: { data: string; from: string }) => Promise<string>;
  signerAddress: string;
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

  const rsvSignature = await signTransactionHash({
    signMessage,
    signerAddress,
    message: txHash,
  });
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

export const getSafeOwners = async ({
  safeAddress,
}: {
  safeAddress: string;
}): Promise<string[]> => {
  const { NetworkController } = Engine.context;
  const networkClientId = NetworkController.findNetworkClientIdByChainId(
    numberToHex(POLYGON_MAINNET_CHAIN_ID),
  );
  const ethQuery = new EthQuery(
    NetworkController.getNetworkClientById(networkClientId).provider,
  );

  const owners = await query(ethQuery, 'call', [
    {
      to: safeAddress,
      data: new Interface(safeAbi).encodeFunctionData('getOwners', []),
    },
  ]);

  return owners;
};
