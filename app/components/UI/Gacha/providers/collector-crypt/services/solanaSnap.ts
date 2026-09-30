import { HandlerType } from '@metamask/snaps-utils';
import { is, string, type } from '@metamask/superstruct';
import { v4 as uuidv4 } from 'uuid';
import type { HandleSnapRequestArgs } from '../../../../../../core/Snaps/types';
import { SOLANA_WALLET_SNAP_ID } from '../../../../../../core/SnapKeyring/SolanaWalletSnap';
import { COLLECTOR_CRYPT_SCOPE } from '../constants';
import { createCollectorCryptError, type CollectorCryptError } from './errors';

/** Client-only Solana snap method adding the account signature, no broadcast. */
export const SOLANA_SIGN_TRANSACTION_METHOD = 'signTransaction';

export interface SignedSolanaTransaction {
  /** Base64 full wire transaction. */
  signedTransaction: string;
  /** Base58 first signature (transaction id). */
  signature: string;
}

/**
 * Minimal function the controller passes:
 * `(args) => messenger.call('SnapController:handleRequest', args)`.
 */
export type SnapRequestFn = (args: HandleSnapRequestArgs) => Promise<unknown>;

const SignTransactionResponseStruct = type({
  signedTransaction: string(),
  signature: string(),
});

/** JSON-RPC "method not found". */
const METHOD_NOT_FOUND_CODE = -32601;
const UNSUPPORTED_MESSAGE =
  /method not found|does not exist|not supported|unknown method|unsupported method/iu;

/** Error code and message nested in a snap error (`data.cause` included). */
const getErrorDetails = (
  error: unknown,
): { code?: unknown; message: string } => {
  const value = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
    data?: { cause?: { code?: unknown; message?: unknown } };
  };
  const cause = value.data?.cause;
  const messages = [value.message, cause?.message].filter(
    (message): message is string => typeof message === 'string',
  );
  return {
    code: value.code === METHOD_NOT_FOUND_CODE ? value.code : cause?.code,
    message: messages.join(': ') || String(error),
  };
};

/** Whether the installed snap does not know the method yet. */
export const isSnapMethodUnsupported = (error: unknown): boolean => {
  const { code, message } = getErrorDetails(error);
  return code === METHOD_NOT_FOUND_CODE || UNSUPPORTED_MESSAGE.test(message);
};

/** Maps a snap failure: unknown method -> SNAP_UNSUPPORTED, else SIGNING_REJECTED. */
const toSigningError = (error: unknown): CollectorCryptError =>
  createCollectorCryptError({
    code: isSnapMethodUnsupported(error)
      ? 'SNAP_UNSUPPORTED'
      : 'SIGNING_REJECTED',
    retryable: false,
    message: getErrorDetails(error).message,
    cause: error,
  });

/** Snap request args for `signTransaction`. */
export const buildSignTransactionRequest = ({
  accountId,
  transaction,
}: {
  accountId: string;
  transaction: string;
}): HandleSnapRequestArgs => ({
  origin: 'metamask',
  snapId: SOLANA_WALLET_SNAP_ID,
  handler: HandlerType.OnClientRequest,
  request: {
    jsonrpc: '2.0',
    id: uuidv4(),
    method: SOLANA_SIGN_TRANSACTION_METHOD,
    params: { accountId, transaction, scope: COLLECTOR_CRYPT_SCOPE },
  },
});

/**
 * Asks the Solana snap to add the account signature, without confirmation UI
 * and without broadcasting. This POC trusts CollectorCrypt's transaction
 * contents and passes them through to the snap without decoding them.
 */
export const signSolanaTransactionSilently = async (
  request: SnapRequestFn,
  params: { accountId: string; transaction: string },
): Promise<SignedSolanaTransaction> => {
  let response: unknown;
  try {
    response = await request(buildSignTransactionRequest(params));
  } catch (error) {
    throw toSigningError(error);
  }
  if (!is(response, SignTransactionResponseStruct)) {
    throw createCollectorCryptError({
      code: 'SIGNING_REJECTED',
      message: 'Solana snap signTransaction: invalid response',
    });
  }
  const { signedTransaction, signature } = response;
  return { signedTransaction, signature };
};
