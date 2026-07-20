import { ethers } from 'ethers';
import {
  encodeSmartContractWrite,
  immersveNetworkToCaipChainId,
} from './immersveFunding';
import type { CardSmartContractWriteParams } from '../../../../core/Engine/controllers/card-controller/provider-types';

const APPROVE_ABI = [
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

describe('immersveNetworkToCaipChainId', () => {
  it('maps base-mainnet to eip155:8453', () => {
    expect(immersveNetworkToCaipChainId('base-mainnet')).toBe('eip155:8453');
  });

  it('maps base-sepolia to eip155:84532', () => {
    expect(immersveNetworkToCaipChainId('base-sepolia')).toBe('eip155:84532');
  });

  it('throws for an unknown or missing network', () => {
    expect(() => immersveNetworkToCaipChainId('polygon')).toThrow();
    expect(() => immersveNetworkToCaipChainId(undefined)).toThrow();
  });
});

describe('encodeSmartContractWrite', () => {
  const spender = '0x1111111111111111111111111111111111111111';
  const value = '1000000';

  it('encodes an approve write using named abi inputs', () => {
    const write: CardSmartContractWriteParams = {
      abi: APPROVE_ABI,
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      method: 'approve',
      params: { _spender: spender, _value: value },
    };

    const expected = new ethers.utils.Interface(APPROVE_ABI).encodeFunctionData(
      'approve',
      [spender, value],
    );
    expect(encodeSmartContractWrite(write)).toBe(expected);
  });

  it('falls back to positional param keys when names are absent', () => {
    const write: CardSmartContractWriteParams = {
      abi: APPROVE_ABI,
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      method: 'approve',
      params: { '0': spender, '1': value },
    };

    const expected = new ethers.utils.Interface(APPROVE_ABI).encodeFunctionData(
      'approve',
      [spender, value],
    );
    expect(encodeSmartContractWrite(write)).toBe(expected);
  });

  it('throws when a required param is missing', () => {
    const write: CardSmartContractWriteParams = {
      abi: APPROVE_ABI,
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      method: 'approve',
      params: { _spender: spender },
    };
    expect(() => encodeSmartContractWrite(write)).toThrow(/_value/);
  });
});
