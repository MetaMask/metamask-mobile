import { ethers } from 'ethers';
import type { CardSmartContractWriteParams } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  BASE_USDC_TOKEN_ADDRESS,
  BASE_SEPOLIA_USDC_TOKEN_ADDRESS,
} from '../constants';

export function immersveNetworkToCaipChainId(network?: string): string {
  switch (network) {
    case 'base-mainnet':
      return 'eip155:8453';
    case 'base-sepolia':
      return 'eip155:84532';
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
    default:
      throw new Error(`Unsupported Immersve funding network: ${network}`);
  }
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
