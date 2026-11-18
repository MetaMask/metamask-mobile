import { HandlerType } from '@metamask/snaps-utils';
import { is, string, type, type Infer } from '@metamask/superstruct';
import { v4 as uuidv4 } from 'uuid';
import type { HandleSnapRequestArgs } from '../../../../../../core/Snaps/types';
import { SOLANA_WALLET_SNAP_ID } from '../../../../../../core/SnapKeyring/SolanaWalletSnap';
import { PACK_PARTNER_SCOPE } from '../constants/packPartner';
import type { PackPartnerNftStandard } from '../types/packPartner';
import { createPackPartnerError, type PackPartnerError } from './errors';

/** Client-only Solana Snap methods that validate Pack Partner transactions. */
const SIGN_BUY_METHOD = 'signPackPartnerBuy';
const SIGN_BUYBACK_METHOD = 'signPackPartnerBuyback';

interface BuyParams {
  accountId: string;
  transaction: string;
  /** Exact pack price in atomic USDC units. */
  amount: string;
}

interface BuybackParams extends BuyParams {
  /** Selected NFT/asset address, regardless of its on-chain standard. */
  assetAddress: string;
  /** Hint only: the Snap verifies the actual transaction independently. */
  expectedStandard: PackPartnerNftStandard;
}

/**
 * Minimal function the controller passes:
 * `(args) => messenger.call('SnapController:handleRequest', args)`.
 */
export type SnapRequestFn = (args: HandleSnapRequestArgs) => Promise<unknown>;

const SignTransactionResponseStruct = type({
  /** Base64 full wire transaction. */
  signedTransaction: string(),
  /** Base58 first signature (transaction id). */
  signature: string(),
});

/** Transaction signed by the Solana snap. */
export type SignedSolanaTransaction = Infer<
  typeof SignTransactionResponseStruct
>;

/** JSON-RPC "method not found". */
const METHOD_NOT_FOUND_CODE = -32601;
// Older Snap errors can lose their JSON-RPC code. Match method-specific wording
// only: an unsupported NFT/network is a guard rejection, not an outdated Snap.
const UNSUPPORTED_MESSAGE =
  /\b(?:method not found|unknown method|unsupported method)\b|\bmethod ["']?signPackPartner(?:Buy|Buyback)["']? (?:does not exist|is not supported)\b/iu;

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
const toSigningError = (error: unknown): PackPartnerError =>
  createPackPartnerError({
    code: isSnapMethodUnsupported(error)
      ? 'SNAP_UNSUPPORTED'
      : 'SIGNING_REJECTED',
    retryable: false,
    context: 'Solana snap',
  });

const buildPackPartnerRequest = (
  method: typeof SIGN_BUY_METHOD | typeof SIGN_BUYBACK_METHOD,
  params: {
    accountId: string;
    transaction: string;
    context: {
      amount: string;
      assetAddress?: string;
      expectedStandard?: PackPartnerNftStandard;
    };
  },
): HandleSnapRequestArgs => ({
  origin: 'metamask',
  snapId: SOLANA_WALLET_SNAP_ID,
  handler: HandlerType.OnClientRequest,
  request: {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params: { ...params, scope: PACK_PARTNER_SCOPE },
  },
});

/**
 * Build a guarded purchase request. The Snap validates the presigned payment
 * against the confirmed price before signing, and never broadcasts it.
 */
export const buildSignPackPartnerBuyRequest = ({
  accountId,
  transaction,
  amount,
}: BuyParams): HandleSnapRequestArgs =>
  buildPackPartnerRequest(SIGN_BUY_METHOD, {
    accountId,
    transaction,
    context: { amount },
  });

/** Build a guarded buyback request for the selected card and exact offer. */
export const buildSignPackPartnerBuybackRequest = ({
  accountId,
  transaction,
  amount,
  assetAddress,
  expectedStandard,
}: BuybackParams): HandleSnapRequestArgs =>
  buildPackPartnerRequest(SIGN_BUYBACK_METHOD, {
    accountId,
    transaction,
    context: { amount, assetAddress, expectedStandard },
  });

const signPackPartnerTransaction = async (
  request: SnapRequestFn,
  args: HandleSnapRequestArgs,
): Promise<SignedSolanaTransaction> => {
  let response: unknown;
  try {
    response = await request(args);
  } catch (error) {
    throw toSigningError(error);
  }
  if (!is(response, SignTransactionResponseStruct)) {
    throw createPackPartnerError({
      code: 'SIGNING_REJECTED',
      context: 'Solana snap',
    });
  }
  const { signedTransaction, signature } = response;
  return { signedTransaction, signature };
};

/** Validate and sign a Pack Partner purchase, without broadcasting. */
export const signPackPartnerBuy = (
  request: SnapRequestFn,
  params: BuyParams,
): Promise<SignedSolanaTransaction> =>
  signPackPartnerTransaction(request, buildSignPackPartnerBuyRequest(params));

/** Validate and sign a Pack Partner buyback, without broadcasting. */
export const signPackPartnerBuyback = (
  request: SnapRequestFn,
  params: BuybackParams,
): Promise<SignedSolanaTransaction> =>
  signPackPartnerTransaction(
    request,
    buildSignPackPartnerBuybackRequest(params),
  );
