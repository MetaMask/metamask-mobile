import type {
  GetSolanaPayFollowUpStatusRequest,
  GetSolanaPayPreflightRequest,
  GetSolanaPayTransactionStatusRequest,
  SolanaPayCallbacks,
  SolanaPayFollowUpRequest,
  SolanaPaySignAndSendTransactionRequest,
  SolanaPaySubmissionResult,
} from '@metamask/transaction-pay-controller';
import {
  Connection,
  PublicKey,
  SystemInstruction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type AddressLookupTableAccount,
} from '@solana/web3.js';
import { FeeType } from '@metamask/keyring-api';
import { HandlerType } from '@metamask/snaps-utils';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { SnapId } from '@metamask/snaps-sdk';
import {
  hasProperty,
  isObject,
  parseCaipAssetType,
  type Hex,
  type Json,
} from '@metamask/utils';
// eslint-disable-next-line import-x/no-nodejs-modules
import { Buffer } from 'buffer';
import { v4 as uuid } from 'uuid';
import BigNumber from 'bignumber.js';
import { errorCodes } from '@metamask/rpc-errors';
import { sha256 } from '@noble/hashes/sha2';

import Engine from '../../Engine';
import { handleSnapRequest } from '../../../Snaps/utils';
import { getAmountData } from './amount-data-callback';

const COMMITMENT = 'confirmed';
const LAMPORTS_PER_SOL = 1_000_000_000;
const ASSOCIATED_TOKEN_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const INVALID_REQUEST_CODES = new Set([-32600, -32601, -32602]);

interface SnapFee {
  type: FeeType;
  asset: { amount: string };
}

function getConnection(scope: GetSolanaPayPreflightRequest['scope']) {
  const config =
    Engine.context.ConfigRegistryController.getNetworkConfigByCaip2ChainId(
      scope,
    );
  const rpcUrl = config?.rpcProviders?.default?.url;

  if (!rpcUrl) {
    throw new Error(`Solana Pay RPC URL unavailable for ${scope}`);
  }

  return new Connection(rpcUrl, COMMITMENT);
}

function toInstruction(
  instruction: GetSolanaPayPreflightRequest['transaction']['instructions'][number],
): TransactionInstruction {
  return new TransactionInstruction({
    data: Buffer.from(instruction.data, 'hex'),
    keys: instruction.keys.map((key) => ({
      isSigner: key.isSigner,
      isWritable: key.isWritable,
      pubkey: new PublicKey(key.pubkey),
    })),
    programId: new PublicKey(instruction.programId),
  });
}

async function getLookupTables(
  connection: Connection,
  addresses: string[],
): Promise<AddressLookupTableAccount[]> {
  const responses = await Promise.all(
    addresses.map((address) =>
      connection.getAddressLookupTable(new PublicKey(address), {
        commitment: COMMITMENT,
      }),
    ),
  );

  return responses.map(({ value }, index) => {
    if (!value) {
      throw new Error(
        `Solana Pay lookup table unavailable: ${addresses[index]}`,
      );
    }
    return value;
  });
}

async function getSourceBalanceRaw(
  connection: Connection,
  owner: PublicKey,
  sourceAssetId: GetSolanaPayPreflightRequest['sourceAssetId'],
): Promise<string> {
  const { assetNamespace, assetReference } = parseCaipAssetType(sourceAssetId);

  if (assetNamespace === 'slip44') {
    return String(await connection.getBalance(owner, COMMITMENT));
  }

  const accounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint: new PublicKey(assetReference) },
    COMMITMENT,
  );

  return accounts.value
    .reduce(
      (total, account) =>
        total +
        BigInt(account.account.data.parsed.info.tokenAmount.amount as string),
      0n,
    )
    .toString();
}

function getSnapFeeResult(result: Json): SnapFee[] {
  if (!Array.isArray(result)) {
    throw new Error('Invalid Solana fee response');
  }

  return result.map((fee) => {
    if (
      !isObject(fee) ||
      !hasProperty(fee, 'type') ||
      !Object.values(FeeType).includes(fee.type as FeeType) ||
      !hasProperty(fee, 'asset') ||
      !isObject(fee.asset) ||
      !hasProperty(fee.asset, 'amount') ||
      typeof fee.asset.amount !== 'string'
    ) {
      throw new Error('Invalid Solana fee response');
    }

    return { type: fee.type as FeeType, asset: { amount: fee.asset.amount } };
  });
}

function toLamports(sol: string): string {
  return new BigNumber(sol)
    .multipliedBy(LAMPORTS_PER_SOL)
    .toFixed(0, BigNumber.ROUND_CEIL);
}

async function getSnapFees(
  preparedTransaction: string,
  accountId: string,
  scope: string,
  snapId: SnapId,
): Promise<{ base: string; priority: string }> {
  const result = (await handleSnapRequest(Engine.controllerMessenger, {
    handler: HandlerType.OnClientRequest,
    origin: ORIGIN_METAMASK,
    request: {
      id: uuid(),
      jsonrpc: '2.0',
      method: 'computeFee',
      params: { accountId, scope, transaction: preparedTransaction },
    },
    snapId,
  })) as Json;
  const fees = getSnapFeeResult(result);

  return {
    base: toLamports(
      fees.find(({ type }) => type === FeeType.Base)?.asset.amount ?? '0',
    ),
    priority: toLamports(
      fees.find(({ type }) => type === FeeType.Priority)?.asset.amount ?? '0',
    ),
  };
}

async function getRentDebit(
  instructions: TransactionInstruction[],
  connection: Connection,
): Promise<number> {
  let rentDebit = 0;

  for (const instruction of instructions) {
    if (instruction.programId.equals(new PublicKey(ASSOCIATED_TOKEN_PROGRAM))) {
      const associatedAccount = instruction.keys[1]?.pubkey;
      if (
        associatedAccount &&
        !(await connection.getAccountInfo(associatedAccount, COMMITMENT))
      ) {
        rentDebit += await connection.getMinimumBalanceForRentExemption(
          165,
          COMMITMENT,
        );
      }
      continue;
    }

    try {
      if (SystemInstruction.decodeInstructionType(instruction) === 'Create') {
        rentDebit += Number(
          SystemInstruction.decodeCreateAccount(instruction).lamports,
        );
      }
    } catch {
      // Other programs and System instructions do not encode rent debits.
    }
  }

  return rentDebit;
}

export function getPreparationId({
  accountId,
  preparedTransaction,
  requestId,
  scope,
}: {
  accountId: string;
  preparedTransaction: string;
  requestId: string;
  scope: string;
}): string {
  return Buffer.from(
    sha256(
      Buffer.from(`${accountId}:${scope}:${requestId}:${preparedTransaction}`),
    ),
  ).toString('hex');
}

export async function getSolanaPayPreflight({
  accountId,
  caipAccountId,
  requestId,
  scope,
  sourceAssetId,
  transaction,
}: GetSolanaPayPreflightRequest) {
  const connection = getConnection(scope);
  const accountAddress = caipAccountId.slice(`${scope}:`.length);
  const account = Object.values(
    Engine.context.AccountsController.state.internalAccounts.accounts,
  ).find((candidate) => candidate.address === accountAddress);

  if (!account || account.id !== accountId) {
    throw new Error('Solana Pay source account unavailable');
  }

  const payer = new PublicKey(account.address);
  const instructions = transaction.instructions.map(toInstruction);
  const lookupTables = await getLookupTables(
    connection,
    transaction.addressLookupTableAddresses ?? [],
  );
  const { blockhash } = await connection.getLatestBlockhash(COMMITMENT);
  const message = new TransactionMessage({
    instructions,
    payerKey: payer,
    recentBlockhash: blockhash,
  }).compileToV0Message(lookupTables);
  const prepared = new VersionedTransaction(message);
  const preparedTransaction = Buffer.from(prepared.serialize()).toString(
    'base64',
  );
  const snapId = account.metadata.snap?.id;
  if (!snapId) {
    throw new Error('Solana Pay source Snap unavailable');
  }
  const [
    fees,
    nativeBalance,
    sourceBalanceRaw,
    rentExemptionRequirementRaw,
    rentDebit,
  ] = await Promise.all([
    getSnapFees(preparedTransaction, accountId, scope, snapId as SnapId),
    connection.getBalance(payer, COMMITMENT),
    getSourceBalanceRaw(connection, payer, sourceAssetId),
    connection.getMinimumBalanceForRentExemption(0, COMMITMENT),
    getRentDebit(instructions, connection),
  ]);

  return {
    nativeBalanceRaw: String(nativeBalance),
    networkFeeRaw: fees.base,
    preparedTransaction,
    preparationId: getPreparationId({
      accountId,
      preparedTransaction,
      requestId,
      scope,
    }),
    priorityFeeRaw: fees.priority,
    rentDebitRaw: String(rentDebit),
    rentExemptionRequirementRaw: String(rentExemptionRequirementRaw),
    sourceBalanceRaw,
  };
}

function getErrorCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'number'
  ) {
    return error.code;
  }
  return undefined;
}

function getSubmissionFailure(error: unknown): SolanaPaySubmissionResult {
  const code = getErrorCode(error);
  if (code === errorCodes.provider.userRejectedRequest) {
    return { outcome: 'user-rejected' };
  }
  if (code !== undefined && INVALID_REQUEST_CODES.has(code)) {
    return { outcome: 'not-submitted', errorCode: 'construction_failed' };
  }
  return { outcome: 'ambiguous' };
}

export async function signAndSendSolanaPayTransaction({
  accountId,
  preparedTransaction,
  preparationId,
  requestId,
  scope,
}: SolanaPaySignAndSendTransactionRequest): Promise<SolanaPaySubmissionResult> {
  const expectedPreparationId = getPreparationId({
    accountId,
    preparedTransaction,
    requestId,
    scope,
  });
  if (expectedPreparationId !== preparationId) {
    return { outcome: 'not-submitted', errorCode: 'construction_failed' };
  }
  const account =
    Engine.context.AccountsController.state.internalAccounts.accounts[
      accountId
    ];
  const snapId = account?.metadata.snap?.id;

  if (!snapId) {
    return { outcome: 'not-submitted', errorCode: 'preflight_failed' };
  }

  try {
    const response = await handleSnapRequest(Engine.controllerMessenger, {
      handler: HandlerType.OnClientRequest,
      origin: 'metamask',
      request: {
        id: uuid(),
        jsonrpc: '2.0',
        method: 'signAndSendTransaction',
        params: {
          accountId,
          options: { commitment: COMMITMENT, skipPreflight: false },
          scope,
          transaction: preparedTransaction,
        },
      },
      snapId: snapId as SnapId,
    });

    if (
      typeof response === 'object' &&
      response !== null &&
      'transactionId' in response &&
      typeof response.transactionId === 'string'
    ) {
      return { outcome: 'submitted', transactionId: response.transactionId };
    }

    return { outcome: 'ambiguous' };
  } catch (error) {
    return getSubmissionFailure(error);
  }
}

export async function getSolanaPayTransactionStatus({
  scope,
  transactionId,
}: GetSolanaPayTransactionStatusRequest) {
  const response = await getConnection(scope).getSignatureStatuses(
    [transactionId],
    { searchTransactionHistory: true },
  );
  const status = response.value[0];

  if (!status) {
    return 'unknown' as const;
  }
  if (status.err) {
    return 'failed' as const;
  }
  if (
    status.confirmationStatus === 'confirmed' ||
    status.confirmationStatus === 'finalized'
  ) {
    return 'confirmed' as const;
  }
  return 'pending' as const;
}

function getReceiptLogs(
  receipt: unknown,
): { address: string; data: string; topics: string[] }[] {
  if (
    !isObject(receipt) ||
    !hasProperty(receipt, 'logs') ||
    !Array.isArray(receipt.logs)
  ) {
    throw new Error('Unable to resolve Solana Pay settlement amount');
  }

  return receipt.logs.map((log) => {
    if (
      !isObject(log) ||
      !hasProperty(log, 'address') ||
      typeof log.address !== 'string' ||
      !hasProperty(log, 'data') ||
      typeof log.data !== 'string' ||
      !hasProperty(log, 'topics') ||
      !Array.isArray(log.topics) ||
      !log.topics.every((topic) => typeof topic === 'string')
    ) {
      throw new Error('Unable to resolve Solana Pay settlement amount');
    }

    return {
      address: log.address,
      data: log.data,
      topics: log.topics.filter(
        (topic): topic is string => typeof topic === 'string',
      ),
    };
  });
}

async function getSettledAmount({
  relayTransactionId,
  transaction,
}: SolanaPayFollowUpRequest): Promise<string> {
  const targetAddress = transaction.requiredAssets?.[0]?.address;
  const account = transaction.txParams.from;
  if (!relayTransactionId || !targetAddress || !account) {
    throw new Error('Unable to resolve Solana Pay settlement amount');
  }

  const { provider } = Engine.context.NetworkController.getNetworkClientById(
    transaction.networkClientId,
  );
  const receipt = await provider.request({
    method: 'eth_getTransactionReceipt',
    params: [relayTransactionId],
  });
  const transferTopic =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const recipientTopic = `0x${account
    .toLowerCase()
    .replace(/^0x/u, '')
    .padStart(64, '0')}`;

  return getReceiptLogs(receipt)
    .filter(
      (log) =>
        log.address.toLowerCase() === targetAddress.toLowerCase() &&
        log.topics[0]?.toLowerCase() === transferTopic &&
        log.topics[2]?.toLowerCase() === recipientTopic,
    )
    .reduce(
      (total, log) =>
        total.plus(new BigNumber(log.data.replace(/^0x/u, ''), 16)),
      new BigNumber(0),
    )
    .toFixed(0);
}

export async function submitSolanaPayFollowUp(
  request: SolanaPayFollowUpRequest,
): Promise<SolanaPaySubmissionResult> {
  if (!request.relayTransactionId) {
    return { outcome: 'not-submitted', errorCode: 'construction_failed' };
  }

  const amount = await getSettledAmount(request);
  const { updates } = await getAmountData({
    amount,
    transaction: request.transaction,
  });
  const nestedTransactions = request.transaction.nestedTransactions?.map(
    (transaction) => ({ ...transaction }),
  );
  const from = request.transaction.txParams.from;

  if (!nestedTransactions?.length || !updates.length || !from) {
    return { outcome: 'not-submitted', errorCode: 'construction_failed' };
  }

  updates.forEach(({ nestedTransactionIndex, data }) => {
    const transaction = nestedTransactions[nestedTransactionIndex];
    if (transaction) {
      transaction.data = data;
    }
  });

  const { transaction } = request;

  try {
    const { batchId } =
      await Engine.context.TransactionController.addTransactionBatch({
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        from: from as Hex,
        isGasFeeSponsored: true,
        isInternal: true,
        networkClientId: transaction.networkClientId,
        origin: ORIGIN_METAMASK,
        requireApproval: false,
        skipInitialGasEstimate: true,
        transactions: nestedTransactions.map((nestedTransaction, index) => ({
          params: {
            data: nestedTransaction.data,
            to: nestedTransaction.to,
            value: nestedTransaction.value ?? '0x0',
          },
          type:
            index === 0
              ? (nestedTransaction.type ?? TransactionType.tokenMethodApprove)
              : TransactionType.contractInteraction,
        })),
      });

    return { outcome: 'submitted', transactionId: batchId };
  } catch (error) {
    return getSubmissionFailure(error);
  }
}

export async function getSolanaPayFollowUpStatus({
  transactionId,
}: GetSolanaPayFollowUpStatusRequest) {
  const transactions =
    Engine.context.TransactionController.state.transactions.filter(
      (transaction) => transaction.batchId === transactionId,
    );

  if (transactions.some(({ status }) => status === TransactionStatus.failed)) {
    return 'failed' as const;
  }
  if (
    transactions.length > 0 &&
    transactions.every(({ status }) => status === TransactionStatus.confirmed)
  ) {
    return 'confirmed' as const;
  }
  return transactions.length ? ('pending' as const) : ('unknown' as const);
}

export function createSolanaPayCallbacks(): SolanaPayCallbacks {
  return {
    getNonAtomicFollowUpStatus: getSolanaPayFollowUpStatus,
    getPreflight: getSolanaPayPreflight,
    getTransactionStatus: getSolanaPayTransactionStatus,
    signAndSendTransaction: signAndSendSolanaPayTransaction,
    submitNonAtomicFollowUp: submitSolanaPayFollowUp,
  };
}
