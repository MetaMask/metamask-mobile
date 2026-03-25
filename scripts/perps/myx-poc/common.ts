/**
 * MYX SDK PoC — Shared utilities
 *
 * Network toggle: NETWORK=mainnet|testnet (default: mainnet)
 */

// Polyfill: viem/SDK may JSON.stringify objects containing BigInt values
// eslint-disable-next-line no-extend-native
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { MyxClient, COMMON_PRICE_DECIMALS, COMMON_LP_AMOUNT_DECIMALS } from '@myx-trade/sdk';
import type { PositionType, HistoryOrderItem, PoolSymbolAllResponse, TickerDataItem } from '@myx-trade/sdk';
import { ethers } from 'ethers';
import { createWalletClient as viemCreateWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, lineaSepolia, arbitrumSepolia } from 'viem/chains';

// Re-export SDK types for use in scripts
export type { PositionType, HistoryOrderItem, PoolSymbolAllResponse, TickerDataItem };

// PositionType from SDK is incomplete — API returns extra fields at runtime
export interface PositionData extends PositionType {
  userLeverage: number;
  baseSymbol: string;
  quoteSymbol: string;
  tradingFee: string;
  freeAmount: string;
  lockedAmount: string;
  broker: string;
  earlyClosePrice: string;
  tokenId: string | null;
}

// ethers v5 in this repo — use providers.JsonRpcProvider (not ethers.JsonRpcProvider)

// ============================================================================
// Load .myx.env
// ============================================================================

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(__dirname, '.myx.env');
  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}\nCopy .myx.env.example to .myx.env and fill in your secrets.`,
    );
  }
  const vars: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return vars;
}

const ENV = loadEnvFile();

// ============================================================================
// Constants (from .myx.env)
// ============================================================================

export const ADDRESS = ENV.ADDRESS || '';
export const PRIVATE_KEY = ENV.PRIVATE_KEY || '';

if (!ADDRESS || !PRIVATE_KEY) {
  throw new Error('ADDRESS and PRIVATE_KEY must be set in .myx.env');
}

const NETWORK_CONFIGS = {
  mainnet: {
    chainId: 56,
    brokerAddress: '0xEb8C74fF05e76F85791dD2E4B972E7E78F6287C3',
    collateralToken: '0x55d398326f99059fF775485246999027B3197955',
    collateralSymbol: 'USDT',
    collateralDecimals: 18,
    apiBase: 'https://api.myx.finance',
    rpcUrl: 'https://bsc-dataseed.bnbchain.org',
    viemChain: bsc,
    isTestnet: false,
    appId: ENV.MYX_APP_ID_MAINNET || '',
    apiSecret: ENV.MYX_API_SECRET_MAINNET || '',
  },
  testnet: {
    chainId: 59141,
    brokerAddress: '0x30b1bc9234fea72daba5253bf96d56a91483cbc0',
    collateralToken: '0xD984fd34f91F92DA0586e1bE82E262fF27DC431b',
    collateralSymbol: 'USDC',
    collateralDecimals: 6,
    apiBase: 'https://api-test.myx.cash',
    rpcUrl: 'https://rpc.sepolia.linea.build',
    viemChain: lineaSepolia,
    isTestnet: true,
    appId: ENV.MYX_APP_ID_TESTNET || '',
    apiSecret: ENV.MYX_API_SECRET_TESTNET || '',
  },
  // Arbitrum Sepolia testnet — most active testnet pools (ARB, BTC, WWE) live here
  'testnet-arb': {
    chainId: 421614,
    brokerAddress: '0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176',
    collateralToken: '0x7E248Ec1721639413A280d9E82e2862Cae2E6E28',
    collateralSymbol: 'USDC',
    collateralDecimals: 6,
    apiBase: 'https://api-test.myx.cash',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    viemChain: arbitrumSepolia,
    isTestnet: true,
    appId: ENV.MYX_APP_ID_TESTNET || '',
    apiSecret: ENV.MYX_API_SECRET_TESTNET || '',
  },
} as const;

export type NetworkConfig = (typeof NETWORK_CONFIGS)[keyof typeof NETWORK_CONFIGS];

// ============================================================================
// Network Config
// ============================================================================

export function getNetworkConfig(): NetworkConfig {
  const env = (process.env.NETWORK || 'mainnet').toLowerCase();
  const valid = Object.keys(NETWORK_CONFIGS);
  if (!valid.includes(env)) {
    throw new Error(`Invalid NETWORK="${env}". Use one of: ${valid.join(', ')}`);
  }
  return NETWORK_CONFIGS[env as keyof typeof NETWORK_CONFIGS];
}

// ============================================================================
// MYX Client
// ============================================================================

export function createMyxClient(config: NetworkConfig): MyxClient {
  return new MyxClient({
    chainId: config.chainId,
    brokerAddress: config.brokerAddress,
    isTestnet: config.isTestnet,
  });
}

// ============================================================================
// Signer / WalletClient
// ============================================================================

export function createSigner(config: NetworkConfig): ethers.Wallet {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  return new ethers.Wallet(`0x${PRIVATE_KEY}`, provider);
}

export function createViemWalletClient(config: NetworkConfig) {
  const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
  const walletClient = viemCreateWalletClient({
    account,
    chain: config.viemChain,
    transport: http(config.rpcUrl),
  });

  // The MYX SDK wraps walletClient.transport in an ethers BrowserProvider,
  // which calls eth_requestAccounts, eth_accounts, and eth_sendTransaction.
  // Public RPCs don't support eth_sendTransaction, so we intercept it,
  // sign locally with our private key, and send as eth_sendRawTransaction.
  const signer = new ethers.Wallet(
    `0x${PRIVATE_KEY}`,
    new ethers.providers.JsonRpcProvider(config.rpcUrl),
  );
  const originalRequest = walletClient.transport.request.bind(walletClient.transport);
  // Cast needed: viem's transport type doesn't expose a writable `request` property,
  // but we must override it to intercept eth_sendTransaction for local signing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (walletClient.transport as Record<string, any>).request = async (args: { method: string; params?: unknown[] }) => {
    if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
      return [ADDRESS];
    }
    if (args.method === 'eth_chainId') {
      return `0x${config.chainId.toString(16)}`;
    }
    if (args.method === 'eth_sendTransaction') {
      const txParams = (args.params?.[0] ?? {}) as Record<string, string | undefined>;
      const tx = await signer.sendTransaction({
        to: txParams.to,
        data: txParams.data,
        value: txParams.value || '0x0',
        gasLimit: txParams.gas || txParams.gasLimit,
        ...(txParams.gasPrice ? { gasPrice: txParams.gasPrice } : {}),
        ...(txParams.maxFeePerGas ? { maxFeePerGas: txParams.maxFeePerGas } : {}),
        ...(txParams.maxPriorityFeePerGas
          ? { maxPriorityFeePerGas: txParams.maxPriorityFeePerGas }
          : {}),
      });
      console.log(`  Tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`  Tx confirmed: block ${receipt?.blockNumber}`);
      return tx.hash;
    }
    return originalRequest(args);
  };

  return walletClient;
}

// ============================================================================
// Authentication
// ============================================================================

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function generateAccessToken(
  config: NetworkConfig,
  address: string,
): Promise<{ accessToken: string; expireAt: number }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const expireTime = 86400;
  const signString = `${config.appId}&${timestamp}&${expireTime}&${address}&${config.apiSecret}`;
  const signature = sha256Hex(signString);

  const params = new URLSearchParams({
    appId: config.appId,
    timestamp: String(timestamp),
    expireTime: String(expireTime),
    allowAccount: address,
    signature,
  });

  const url = `${config.apiBase}/openapi/gateway/auth/api_key/create_token?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Token API failed: ${response.status}`);
  }

  const result = (await response.json()) as {
    code: number;
    data?: { accessToken: string; expireAt: number };
    message?: string;
  };

  if ((result.code !== 9200 && result.code !== 0) || !result.data?.accessToken) {
    throw new Error(`Token API error: code=${result.code} message=${result.message ?? 'unknown'}`);
  }

  return result.data;
}

export async function authenticateClient(
  client: MyxClient,
  config: NetworkConfig,
): Promise<void> {
  const signer = createSigner(config);
  const walletClient = createViemWalletClient(config);

  const getAccessToken = async () => {
    const token = await generateAccessToken(config, ADDRESS);
    const prefixed = token.accessToken.startsWith('sdk.')
      ? token.accessToken
      : `sdk.${token.accessToken}`;
    return { accessToken: prefixed, expireAt: token.expireAt };
  };

  // Cast needed on signer: SDK expects ethers v6 Signer, we use ethers v5 Wallet.
  // The runtime interface is compatible but the types differ.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.auth({
    signer: signer as unknown as Parameters<typeof client.auth>[0]['signer'],
    getAccessToken,
    walletClient,
  });

  // Trigger token generation to verify auth works
  await getAccessToken();
  console.log('Authentication successful');
}

// ============================================================================
// MYX Protocol Constants
// These are protocol-wide values, the same across all assets and networks.
// ============================================================================

/** Price precision: 30 decimals — re-exported from SDK (`COMMON_PRICE_DECIMALS`) */
export const MYX_PRICE_DECIMALS = COMMON_PRICE_DECIMALS; // 30

/**
 * Position size precision: 18 decimals.
 * SDK exports `COMMON_LP_AMOUNT_DECIMALS` (18) for LP amounts but has no
 * equivalent constant for position size — they use the same 18-decimal precision.
 */
export const MYX_SIZE_DECIMALS = COMMON_LP_AMOUNT_DECIMALS; // 18

/**
 * Fee rate precision: 1e8 (on-chain RATE_PRECISION).
 * All fee rates from getUserTradingFeeRate() use this precision.
 * Example: 55000 / 1e8 = 0.00055 = 0.055%
 *
 * Evidence (mainnet chainId 56):
 *   baseTakerFeeRate = 10000  → 10000/1e8 = 0.01%  (base fee)
 *   addOn             = 45000  → 45000/1e8 = 0.045% (tier add-on)
 *   takerFeeRate      = 55000  → 55000/1e8 = 0.055% (matches MYX docs)
 *   With 1e6 the rate would be 5.5% — no perps DEX charges that.
 *
 * Not exported by SDK — no constant available. The on-chain contract
 * exposes RATE_PRECISION() on the fee manager but not via the broker proxy.
 */
export const MYX_RATE_PRECISION = 100000000n;

/**
 * Default taker fee rate (in 1e8 precision).
 * Observed from getUserTradingFeeRate(0, 0, chainId) on both mainnet and testnet.
 * 55000 / 1e8 = 0.00055 = 0.055%
 */
export const MYX_DEFAULT_TAKER_FEE_RATE = 55000n;

// ============================================================================
// Decimal Helpers (native BigInt)
// ============================================================================

/** Human price -> 30-decimal contract price string */
export function toContractPrice(price: number | string): string {
  const [whole, frac = ''] = String(price).split('.');
  const padded = (frac + '0'.repeat(MYX_PRICE_DECIMALS)).slice(0, MYX_PRICE_DECIMALS);
  return (BigInt(whole) * 10n ** BigInt(MYX_PRICE_DECIMALS) + BigInt(padded)).toString();
}

/** Human size -> 18-decimal size string */
export function toSize(size: number | string): string {
  const [whole, frac = ''] = String(size).split('.');
  const padded = (frac + '0'.repeat(MYX_SIZE_DECIMALS)).slice(0, MYX_SIZE_DECIMALS);
  return (BigInt(whole) * 10n ** BigInt(MYX_SIZE_DECIMALS) + BigInt(padded)).toString();
}

/** Human amount -> collateral token native decimals */
export function toCollateral(amount: number | string, decimals: number): string {
  const [whole, frac = ''] = String(amount).split('.');
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded)).toString();
}

// ============================================================================
// CLI Helpers
// ============================================================================

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      args[key] = next && !next.startsWith('--') ? next : 'true';
      if (next && !next.startsWith('--')) i++;
    }
  }
  return args;
}

/**
 * Get the visual display width of a string, accounting for
 * wide characters (CJK, emoji) that take 2 columns in a terminal.
 */
function displayWidth(str: string): number {
  let w = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs, CJK Compat, Fullwidth forms, common emoji ranges
    if (
      (cp >= 0x1100 && cp <= 0x115f) ||  // Hangul Jamo
      (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) || // CJK
      (cp >= 0xac00 && cp <= 0xd7a3) ||  // Hangul Syllables
      (cp >= 0xf900 && cp <= 0xfaff) ||  // CJK Compat Ideographs
      (cp >= 0xfe10 && cp <= 0xfe6f) ||  // CJK Compat Forms + Small Forms
      (cp >= 0xff01 && cp <= 0xff60) ||  // Fullwidth Forms
      (cp >= 0xffe0 && cp <= 0xffe6) ||  // Fullwidth Signs
      (cp >= 0x1f000 && cp <= 0x1fbff) || // Emoji & symbols
      (cp >= 0x20000 && cp <= 0x2fa1f)    // CJK Extension B+
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

/** Pad string to target display width */
function padDisplay(str: string, target: number): string {
  const pad = target - displayWidth(str);
  return pad > 0 ? str + ' '.repeat(pad) : str;
}

export function printTable(
  rows: Record<string, string | number>[],
  columns?: string[],
): void {
  if (rows.length === 0) {
    console.log('(no data)');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  const widths = cols.map((c) =>
    Math.max(
      displayWidth(c),
      ...rows.map((r) => displayWidth(String(r[c] ?? ''))),
    ),
  );

  const header = cols.map((c, i) => padDisplay(c, widths[i])).join(' | ');
  const sep = widths.map((w) => '-'.repeat(w)).join('-+-');
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    console.log(
      cols.map((c, i) => padDisplay(String(row[c] ?? ''), widths[i])).join(' | '),
    );
  }
}
