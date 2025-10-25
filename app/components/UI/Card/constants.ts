import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';

export const BALANCE_SCANNER_ABI =
  balanceScannerAbi as ethers.ContractInterface;
export const ARBITRARY_ALLOWANCE = 100000000000;
export const DEPOSIT_SUPPORTED_TOKENS = ['USDC', 'USDT', 'mUSD'];

// Maximum spending limit allowed by Baanx
export const BAANX_MAX_LIMIT = '2199023255551';
