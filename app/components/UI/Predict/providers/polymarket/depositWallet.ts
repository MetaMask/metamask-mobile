import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import {
  getAddress,
  getCreate2Address,
  hexConcat,
  hexZeroPad,
  keccak256,
} from 'ethers/lib/utils';
import { POLYGON_MAINNET_CHAIN_ID } from './constants';
import type { PolymarketProtocolDefinition } from './protocol/definitions';
import type { SafeTransaction } from './safe/types';
import type { ApiKeyCreds } from './types';
import type { Signer } from '../types';
import { getL2Headers, getPolymarketEndpoints } from './utils';

export const DEPOSIT_WALLET_FACTORY_ADDRESS =
  '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07';
export const DEPOSIT_WALLET_IMPLEMENTATION_ADDRESS =
  '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB';

const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
// Polymarket's relayer rejects deadlines above 300s, so use the maximum
// allowed window to reduce intermittent "deadline too soon" failures.
const DEPOSIT_WALLET_BATCH_DEADLINE_SECONDS = 300;

const RELAYER_SUCCESS_STATES = new Set(['STATE_MINED', 'STATE_CONFIRMED']);
const RELAYER_FAILURE_STATES = new Set(['STATE_FAILED', 'STATE_INVALID']);

/**
 * Byte constants from Solady LibClone.initCodeHashERC1967 used by the
 * Polymarket DepositWalletFactory.
 */
const ERC1967_CONST1 =
  '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3';
const ERC1967_CONST2 =
  '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076';
const ERC1967_PREFIX = 0x61003d3d8160233d3973n;

export interface DepositWalletCall {
  target: string;
  value: string;
  data: string;
}

export interface DepositWalletRelayerResponse {
  transactionID?: string;
  transactionHash?: string;
  state?: string;
  nonce?: string;
  error?: string;
  id?: string;
  [key: string]: unknown;
}

interface DepositWalletDeploymentResponse {
  deployed?: boolean;
  error?: string;
  [key: string]: unknown;
}

export type RelayerProxyEnvelope =
  | { path: '/submit'; method: 'POST'; body: unknown }
  | { path: '/nonce'; method: 'GET'; query: Record<string, string> }
  | { path: '/transaction'; method: 'GET'; query: Record<string, string> }
  | { path: '/deployed'; method: 'GET'; query: Record<string, string> };

function toFixedSizeHex(value: bigint, sizeBytes: number): Hex {
  const hex = value.toString(16).padStart(sizeBytes * 2, '0');

  if (hex.length > sizeBytes * 2) {
    throw new Error('Value exceeds requested byte size');
  }

  return `0x${hex}` as Hex;
}

function initCodeHashERC1967({
  implementation,
  args,
}: {
  implementation: string;
  args: Hex;
}): Hex {
  const argsLength = BigInt((args.length - 2) / 2);
  const prefix = toFixedSizeHex(ERC1967_PREFIX + (argsLength << 56n), 10);

  return keccak256(
    hexConcat([
      prefix,
      getAddress(implementation),
      '0x6009',
      ERC1967_CONST2,
      ERC1967_CONST1,
      args,
    ]),
  ) as Hex;
}

export function getDepositWalletId(ownerAddress: string): Hex {
  return hexZeroPad(getAddress(ownerAddress), 32) as Hex;
}

export function deriveDepositWalletAddress(ownerAddress: string): Hex {
  const factoryAddress = getAddress(DEPOSIT_WALLET_FACTORY_ADDRESS);
  const implementationAddress = getAddress(
    DEPOSIT_WALLET_IMPLEMENTATION_ADDRESS,
  );
  const walletId = getDepositWalletId(ownerAddress);
  const args = ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes32'],
    [factoryAddress, walletId],
  ) as Hex;
  const salt = keccak256(args) as Hex;
  const bytecodeHash = initCodeHashERC1967({
    implementation: implementationAddress,
    args,
  });

  return getAddress(
    getCreate2Address(factoryAddress, salt, bytecodeHash),
  ) as Hex;
}

export function toDepositWalletCalls(
  transactions: SafeTransaction[],
): DepositWalletCall[] {
  return transactions.map((transaction) => ({
    target: transaction.to,
    value: transaction.value,
    data: transaction.data,
  }));
}

async function postRelayerProxy<TResponse>(
  envelope: RelayerProxyEnvelope,
): Promise<TResponse> {
  const { CLOB_RELAYER } = getPolymarketEndpoints();
  const response = await fetch(`${CLOB_RELAYER}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Polymarket relayer proxy request failed: ${response.status} ${responseText}`,
    );
  }

  if (!responseText) {
    throw new Error('Polymarket relayer proxy returned an empty response');
  }

  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error('Polymarket relayer proxy returned malformed JSON');
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as DepositWalletRelayerResponse).error === 'string'
  ) {
    throw new Error((data as DepositWalletRelayerResponse).error);
  }

  return data as TResponse;
}

export function getDepositWalletRelayerTransactionId(
  response: DepositWalletRelayerResponse,
): string | undefined {
  return response.transactionID ?? response.id;
}

export async function requestDepositWalletCreate({
  ownerAddress,
}: {
  ownerAddress: string;
}): Promise<DepositWalletRelayerResponse> {
  return postRelayerProxy<DepositWalletRelayerResponse>({
    path: '/submit',
    method: 'POST',
    body: {
      type: 'WALLET-CREATE',
      from: ownerAddress,
      to: DEPOSIT_WALLET_FACTORY_ADDRESS,
    },
  });
}

export async function getDepositWalletNonce({
  ownerAddress,
}: {
  ownerAddress: string;
}): Promise<string> {
  const response = await postRelayerProxy<DepositWalletRelayerResponse>({
    path: '/nonce',
    method: 'GET',
    query: {
      address: ownerAddress,
      type: 'WALLET',
    },
  });

  if (!response.nonce) {
    throw new Error('Polymarket relayer proxy nonce response missing nonce');
  }

  return response.nonce;
}

const DEPOSIT_WALLET_EIP712_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Call: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ],
  Batch: [
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'calls', type: 'Call[]' },
  ],
};

export async function executeDepositWalletBatch({
  signer,
  walletAddress,
  calls,
}: {
  signer: Signer;
  walletAddress: string;
  calls: DepositWalletCall[];
}): Promise<DepositWalletRelayerResponse> {
  if (calls.length === 0) {
    throw new Error('Deposit wallet batch requires at least one call');
  }

  const nonce = await getDepositWalletNonce({ ownerAddress: signer.address });
  const deadline = String(
    Math.floor(Date.now() / 1000) + DEPOSIT_WALLET_BATCH_DEADLINE_SECONDS,
  );
  const normalizedWalletAddress = getAddress(walletAddress);

  const signature = await signer.signTypedMessage(
    {
      from: signer.address,
      data: {
        domain: {
          name: DEPOSIT_WALLET_DOMAIN_NAME,
          version: DEPOSIT_WALLET_DOMAIN_VERSION,
          chainId: POLYGON_MAINNET_CHAIN_ID,
          verifyingContract: normalizedWalletAddress,
        },
        types: DEPOSIT_WALLET_EIP712_TYPES,
        primaryType: 'Batch',
        message: {
          wallet: normalizedWalletAddress,
          nonce,
          deadline,
          calls,
        },
      },
    },
    SignTypedDataVersion.V4,
  );

  return postRelayerProxy<DepositWalletRelayerResponse>({
    path: '/submit',
    method: 'POST',
    body: {
      type: 'WALLET',
      from: signer.address,
      to: DEPOSIT_WALLET_FACTORY_ADDRESS,
      nonce,
      signature,
      depositWalletParams: {
        depositWallet: normalizedWalletAddress,
        deadline,
        calls,
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTransactionResponse(
  response: DepositWalletRelayerResponse | DepositWalletRelayerResponse[],
): DepositWalletRelayerResponse | undefined {
  return Array.isArray(response) ? response[0] : response;
}

export async function waitForDepositWalletTransaction({
  transactionID,
  requireCompletion = false,
  maxPolls = 20,
  pollIntervalMs = 1000,
}: {
  transactionID: string;
  requireCompletion?: boolean;
  maxPolls?: number;
  pollIntervalMs?: number;
}): Promise<Hex> {
  for (let poll = 0; poll < maxPolls; poll++) {
    const response = await postRelayerProxy<
      DepositWalletRelayerResponse | DepositWalletRelayerResponse[]
    >({
      path: '/transaction',
      method: 'GET',
      query: { id: transactionID },
    });
    const transaction = getTransactionResponse(response);
    const state = transaction?.state;
    const transactionHash = transaction?.transactionHash;

    if (state && RELAYER_FAILURE_STATES.has(state)) {
      throw new Error(
        `Polymarket deposit wallet relayer transaction ${transactionID} ${state}`,
      );
    }

    if (state && RELAYER_SUCCESS_STATES.has(state) && transactionHash) {
      return transactionHash as Hex;
    }

    if (!requireCompletion && transactionHash) {
      return transactionHash as Hex;
    }

    if (poll < maxPolls - 1) {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(
    `Timed out waiting for Polymarket deposit wallet relayer transaction ${transactionID}`,
  );
}

export async function executeDepositWalletBatchAndWaitForCompletion({
  signer,
  walletAddress,
  calls,
}: {
  signer: Signer;
  walletAddress: string;
  calls: DepositWalletCall[];
}): Promise<Hex> {
  const response = await executeDepositWalletBatch({
    signer,
    walletAddress,
    calls,
  });
  const transactionID = getDepositWalletRelayerTransactionId(response);

  if (!transactionID) {
    throw new Error(
      'Polymarket deposit wallet batch response missing transactionID',
    );
  }

  return waitForDepositWalletTransaction({
    transactionID,
    requireCompletion: true,
  });
}

export async function waitForDepositWalletDeployed({
  walletAddress,
  maxPolls = 20,
  pollIntervalMs = 1000,
}: {
  walletAddress: string;
  maxPolls?: number;
  pollIntervalMs?: number;
}): Promise<void> {
  const normalizedWalletAddress = getAddress(walletAddress);

  for (let poll = 0; poll < maxPolls; poll++) {
    const response = await postRelayerProxy<DepositWalletDeploymentResponse>({
      path: '/deployed',
      method: 'GET',
      query: {
        address: normalizedWalletAddress,
        type: 'WALLET',
      },
    });

    if (response.deployed === true) {
      return;
    }

    if (poll < maxPolls - 1) {
      await sleep(pollIntervalMs);
    }
  }

  throw new Error(
    `Timed out waiting for Polymarket deposit wallet ${normalizedWalletAddress} to be recognized by relayer`,
  );
}

export async function syncDepositWalletCollateralBalanceAllowance({
  protocol,
  signerAddress,
  apiKey,
}: {
  protocol: PolymarketProtocolDefinition;
  signerAddress: string;
  apiKey: ApiKeyCreds;
}): Promise<void> {
  const requestPath = '/balance-allowance/update';
  const queryString = 'asset_type=COLLATERAL&signature_type=3';
  const headers = await getL2Headers({
    l2HeaderArgs: { method: 'GET', requestPath },
    address: signerAddress,
    apiKey,
  });
  const response = await fetch(
    `${protocol.transport.clobBaseUrl}${requestPath}?${queryString}`,
    {
      method: 'GET',
      headers,
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to sync deposit wallet collateral balance allowance: ${response.status} ${responseText}`,
    );
  }
}
