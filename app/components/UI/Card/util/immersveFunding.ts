import { ethers } from 'ethers';
import type { CardSmartContractWriteParams } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  BASE_USDC_TOKEN_ADDRESS,
  BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
  ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS,
} from '../constants';

export function immersveNetworkToCaipChainId(network?: string): string {
  switch (network) {
    case 'base-mainnet':
      return 'eip155:8453';
    case 'base-sepolia':
      return 'eip155:84532';
    case 'arbitrum-sepolia':
      return 'eip155:421614';
    default:
      throw new Error(`Unsupported Immersve funding network: ${network}`);
  }
}

export interface ImmersveFundingTokenInfo {
  caipChainId: string;
  tokenAddress: string;
  decimals: number;
}

export function immersveNetworkToFundingToken(
  network?: string,
): ImmersveFundingTokenInfo {
  switch (network) {
    case 'base-mainnet':
      return {
        caipChainId: 'eip155:8453',
        tokenAddress: BASE_USDC_TOKEN_ADDRESS,
        decimals: 6,
      };
    case 'base-sepolia':
      return {
        caipChainId: 'eip155:84532',
        tokenAddress: BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
        decimals: 6,
      };
    case 'arbitrum-sepolia':
      return {
        caipChainId: 'eip155:421614',
        tokenAddress: ARBITRUM_SEPOLIA_USDC_TOKEN_ADDRESS,
        decimals: 6,
      };
    default:
      throw new Error(`Unsupported Immersve funding network: ${network}`);
  }
}

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

/**
 * Builds a local ERC-20 approve write for Immersve funding (e.g. revoke via
 * amountBaseUnits `'0'`). Used when no spending-prerequisites payload exists.
 */
export function buildImmersveApproveWrite({
  tokenAddress,
  spenderAddress,
  amountBaseUnits,
}: {
  tokenAddress: string;
  spenderAddress: string;
  amountBaseUnits: string;
}): CardSmartContractWriteParams {
  return {
    abi: ERC20_APPROVE_ABI,
    contractAddress: tokenAddress,
    method: 'approve',
    params: {
      _spender: spenderAddress,
      _value: amountBaseUnits,
    },
  };
}

/**
 * Clones a smart-contract write and overrides its ERC-20 approve amount
 * (the single uint256 ABI input), preserving spender and other params.
 */
export function withApproveAmount(
  write: CardSmartContractWriteParams,
  amountBaseUnits: string,
): CardSmartContractWriteParams {
  const iface = new ethers.utils.Interface(
    write.abi as ethers.utils.Fragment[],
  );
  const fragment = iface.getFunction(write.method);
  const params = { ...write.params };

  fragment.inputs.forEach((input, index) => {
    if (input.type === 'uint256') {
      if (input.name) {
        params[input.name] = amountBaseUnits;
      }
      params[String(index)] = amountBaseUnits;
    }
  });

  return { ...write, params };
}

export function encodeSmartContractWrite(
  write: CardSmartContractWriteParams,
): string {
  const iface = new ethers.utils.Interface(
    write.abi as ethers.utils.Fragment[],
  );
  const fragment = iface.getFunction(write.method);
  const args = fragment.inputs.map((input, index) => {
    const value = write.params[input.name] ?? write.params[String(index)];
    if (value === undefined) {
      throw new Error(
        `Missing param "${input.name || index}" for method "${write.method}"`,
      );
    }
    return value;
  });
  return iface.encodeFunctionData(write.method, args);
}
