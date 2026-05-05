import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Hex } from '@metamask/utils';
import {
  AbiCoder,
  getAddress,
  getCreate2Address,
  hexDataLength,
  hexZeroPad,
  joinSignature,
  keccak256,
  splitSignature,
} from 'ethers/lib/utils';
import type { Signer } from '../types';
import { POLYGON_MAINNET_CHAIN_ID } from './constants';
import { getL2Headers, getPolymarketEndpoints } from './utils';
import type { ApiKeyCreds } from './types';
import type { PolymarketProtocolDefinition } from './protocol/definitions';
import { getPermit2Nonce } from './safe/utils';
import type { Permit2FeeAuthorization, SafeTransaction } from './safe/types';
import { PERMIT2_ADDRESS } from './safe/constants';

export const DEPOSIT_WALLET_FACTORY_ADDRESS =
  '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07';

export const DEPOSIT_WALLET_IMPLEMENTATION_ADDRESS =
  '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB';

const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet';
const DEPOSIT_WALLET_DOMAIN_VERSION = '1';
const ERC1967_CONST1 =
  '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3';
const ERC1967_CONST2 =
  '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076';
const ERC1967_PREFIX = 0x61003d3d8160233d3973n;
const DEPOSIT_WALLET_BATCH_TTL_SECONDS = 15 * 60;
const RELAYER_SUCCESS_STATES = new Set(['STATE_MINED', 'STATE_CONFIRMED']);
const RELAYER_FAILED_STATES = new Set(['STATE_FAILED', 'STATE_INVALID']);

export interface DepositWalletCall {
  target: string;
  value: string;
  data: string;
}

interface DepositWalletRelayerResponse {
  transactionID?: string;
  transactionHash?: string;
  state?: string;
  nonce?: string;
  error?: string;
  [key: string]: unknown;
}

type WalletRelayerPath =
  | '/wallet/create'
  | '/wallet/nonce'
  | '/wallet/execute'
  | '/wallet/transaction';

function bigintToHex(value: bigint): Hex {
  const hex = value.toString(16);
  return `0x${hex.length % 2 === 0 ? hex : `0${hex}`}` as Hex;
}

function concatHex(values: string[]): Hex {
  return `0x${values
    .map((value) => value.replace(/^0x/u, ''))
    .join('')}` as Hex;
}

function initCodeHashERC1967({
  implementation,
  args,
}: {
  implementation: string;
  args: string;
}): string {
  const argsLength = BigInt(hexDataLength(args) ?? 0);
  const combinedPrefix = ERC1967_PREFIX + (argsLength << 56n);

  return keccak256(
    concatHex([
      hexZeroPad(bigintToHex(combinedPrefix), 10),
      implementation,
      '0x6009',
      ERC1967_CONST2,
      ERC1967_CONST1,
      args,
    ]),
  );
}

export function deriveDepositWalletAddress(ownerAddress: string): Hex {
  const owner = getAddress(ownerAddress);
  const walletId = hexZeroPad(owner, 32);
  const args = new AbiCoder().encode(
    ['address', 'bytes32'],
    [DEPOSIT_WALLET_FACTORY_ADDRESS, walletId],
  );
  const salt = keccak256(args);
  const bytecodeHash = initCodeHashERC1967({
    implementation: DEPOSIT_WALLET_IMPLEMENTATION_ADDRESS,
    args,
  });

  return getCreate2Address(
    DEPOSIT_WALLET_FACTORY_ADDRESS,
    salt,
    bytecodeHash,
  ) as Hex;
}

async function postWalletRelayer<TResponse>({
  path,
  body,
}: {
  path: WalletRelayerPath;
  body: unknown;
}): Promise<TResponse> {
  const { CLOB_RELAYER } = getPolymarketEndpoints();
  const response = await fetch(`${CLOB_RELAYER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => undefined)) as
    | TResponse
    | undefined;

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : response.statusText;
    throw new Error(`Deposit wallet relayer request failed: ${message}`);
  }

  if (!data) {
    throw new Error('Deposit wallet relayer returned an empty response');
  }

  return data;
}

export async function requestDepositWalletCreate({
  ownerAddress,
}: {
  ownerAddress: string;
}): Promise<DepositWalletRelayerResponse> {
  return postWalletRelayer<DepositWalletRelayerResponse>({
    path: '/wallet/create',
    body: {
      owner: ownerAddress,
      factory: DEPOSIT_WALLET_FACTORY_ADDRESS,
    },
  });
}

export async function getDepositWalletNonce({
  ownerAddress,
}: {
  ownerAddress: string;
}): Promise<string> {
  const response = await postWalletRelayer<DepositWalletRelayerResponse>({
    path: '/wallet/nonce',
    body: {
      owner: ownerAddress,
      type: 'WALLET',
    },
  });

  if (!response.nonce) {
    throw new Error('Deposit wallet relayer did not return a nonce');
  }

  return response.nonce;
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

async function signDepositWalletBatch({
  signer,
  walletAddress,
  nonce,
  deadline,
  calls,
}: {
  signer: Signer;
  walletAddress: string;
  nonce: string;
  deadline: string;
  calls: DepositWalletCall[];
}): Promise<string> {
  const data = {
    domain: {
      name: DEPOSIT_WALLET_DOMAIN_NAME,
      version: DEPOSIT_WALLET_DOMAIN_VERSION,
      chainId: POLYGON_MAINNET_CHAIN_ID,
      verifyingContract: walletAddress,
    },
    types: {
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
    },
    primaryType: 'Batch',
    message: {
      wallet: walletAddress,
      nonce,
      deadline,
      calls,
    },
  };

  return signer.signTypedMessage(
    { data, from: signer.address },
    SignTypedDataVersion.V4,
  );
}

export async function executeDepositWalletBatch({
  signer,
  walletAddress,
  calls,
}: {
  signer: Signer;
  walletAddress: string;
  calls: DepositWalletCall[];
}): Promise<DepositWalletRelayerResponse> {
  const nonce = await getDepositWalletNonce({ ownerAddress: signer.address });
  const deadline = `${Math.floor(Date.now() / 1000) + DEPOSIT_WALLET_BATCH_TTL_SECONDS}`;
  const signature = await signDepositWalletBatch({
    signer,
    walletAddress,
    nonce,
    deadline,
    calls,
  });

  return postWalletRelayer<DepositWalletRelayerResponse>({
    path: '/wallet/execute',
    body: {
      owner: signer.address,
      factory: DEPOSIT_WALLET_FACTORY_ADDRESS,
      nonce,
      signature,
      depositWalletParams: {
        depositWallet: walletAddress,
        deadline,
        calls,
      },
    },
  });
}

async function getDepositWalletTransaction({
  transactionID,
}: {
  transactionID: string;
}): Promise<DepositWalletRelayerResponse> {
  const response = await postWalletRelayer<
    DepositWalletRelayerResponse | DepositWalletRelayerResponse[]
  >({
    path: '/wallet/transaction',
    body: { transactionID },
  });

  return Array.isArray(response) ? (response[0] ?? {}) : response;
}

export async function waitForDepositWalletTransaction({
  transactionID,
  maxPolls = 10,
  pollIntervalMs = 2000,
}: {
  transactionID: string;
  maxPolls?: number;
  pollIntervalMs?: number;
}): Promise<void> {
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const transaction = await getDepositWalletTransaction({ transactionID });

    if (transaction.state && RELAYER_SUCCESS_STATES.has(transaction.state)) {
      return;
    }

    if (transaction.state && RELAYER_FAILED_STATES.has(transaction.state)) {
      throw new Error(
        `Deposit wallet transaction failed: ${transaction.state}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Timed out waiting for deposit wallet transaction');
}

export async function syncDepositWalletClobBalanceAllowance({
  protocol,
  signerAddress,
  apiKey,
  assetType = 'COLLATERAL',
  tokenId,
}: {
  protocol: Pick<PolymarketProtocolDefinition, 'transport'>;
  signerAddress: string;
  apiKey: ApiKeyCreds;
  assetType?: 'COLLATERAL' | 'CONDITIONAL';
  tokenId?: string;
}): Promise<void> {
  const params = new URLSearchParams({
    asset_type: assetType,
    signature_type: '3',
  });

  if (tokenId) {
    params.set('token_id', tokenId);
  }

  const requestPath = `/balance-allowance/update?${params.toString()}`;
  const headers = await getL2Headers({
    l2HeaderArgs: {
      method: 'GET',
      requestPath,
    },
    address: signerAddress,
    apiKey,
  });
  const response = await fetch(
    `${protocol.transport.clobBaseUrl}${requestPath}`,
    {
      method: 'GET',
      headers: headers as Record<string, string>,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to sync deposit wallet CLOB balance allowance: ${response.statusText}`,
    );
  }
}

export async function createDepositWalletPermit2FeeAuthorization({
  signer,
  amount,
  spender,
  tokenAddress,
}: {
  signer: Signer;
  amount: bigint;
  spender: string;
  tokenAddress: string;
}): Promise<Permit2FeeAuthorization> {
  const nonce = await getPermit2Nonce();
  const deadline = (Math.floor(Date.now() / 1000) + 3600).toString();
  const message = {
    permitted: { token: tokenAddress, amount: amount.toString() },
    spender,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedMessage(
    {
      from: signer.address,
      data: {
        domain: {
          name: 'Permit2',
          chainId: POLYGON_MAINNET_CHAIN_ID,
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          PermitTransferFrom: [
            { name: 'permitted', type: 'TokenPermissions' },
            { name: 'spender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
          TokenPermissions: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
        },
        primaryType: 'PermitTransferFrom',
        message,
      },
    },
    SignTypedDataVersion.V4,
  );

  return {
    type: 'safe-permit2',
    authorization: {
      permit: message,
      spender,
      signature: joinSignature(splitSignature(signature)),
    },
  };
}
