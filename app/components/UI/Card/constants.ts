import { ethers } from 'ethers';
import balanceScannerAbi from './sdk/balanceScannerAbi.json';

export const BALANCE_SCANNER_ABI =
  balanceScannerAbi as ethers.ContractInterface;
export const ARBITRARY_ALLOWANCE = 100000000000;
