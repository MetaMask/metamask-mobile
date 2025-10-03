import { ethers, BigNumber } from 'ethers';
import { arrayify, hexlify, Interface } from 'ethers/lib/utils';
import { safeAbi, safeFactoryAbi } from './abi';
import {
  OperationType,
  SafeFeeAuthorization,
  SafeTransaction,
  SplitSignature,
} from './types';
import { Hex, numberToHex } from '@metamask/utils';
import { MATIC_CONTRACTS, POLYGON_MAINNET_CHAIN_ID } from '../constants';
import { Signer } from '../../types';
import { SAFE_FACTORY_ADDRESS } from './constants';
import EthQuery from '@metamask/eth-query';
import { query } from '@metamask/controller-utils';
import Engine from '../../../../../../core/Engine';

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
  const nonce = (await query(ethQuery, 'call', [
    {
      to: safeAddress,
      data: new Interface(safeAbi).encodeFunctionData('nonce', []),
    },
  ])) as bigint;

  return nonce;
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
export const computeSafeAddress = async (signer: Signer): Promise<Hex> => {
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
        [signer.address],
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
