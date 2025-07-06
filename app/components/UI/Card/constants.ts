import { ethers } from 'ethers';
import balanceScannerAbi from './balanceScannerAbi.json';

export const CACHE_EXPIRATION = 15 * 60 * 1000; // 15 minutes
export const POLLING_INTERVAL = 30000; // 30 seconds
export const CARD_URL = 'https://card.metamask.io';
export const BALANCE_SCANNER_CONTRACT_ADDRESS =
  '0xed9f04f2da1b42ae558d5e688fe2ef7080931c9a'; // Linea Mainnet
export const BALANCE_SCANNER_ABI =
  balanceScannerAbi as ethers.ContractInterface;
export const FOXCONNECT_GLOBAL_ADDRESS =
  '0x9dd23A4a0845f10d65D293776B792af1131c7B30';
export const FOXCONNECT_US_ADDRESS =
  '0xA90b298d05C2667dDC64e2A4e17111357c215dD2';
export const ON_RAMP_API_URL = 'https://on-ramp.uat-api.cx.metamask.io';
export const ARBITRARY_ALLOWANCE = 100000000000;
