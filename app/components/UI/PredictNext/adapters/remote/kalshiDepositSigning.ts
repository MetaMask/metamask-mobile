import type { TemplateInputs } from '../../auth/signing/profileTemplates';
import type {
  PredictDepositParams,
  PredictDepositSignRequest,
} from '../../types';

/** The networks the `crypto_deposit_address` payload allows. Profile
 * version 3 allows exactly Base. */
const DEPOSIT_NETWORKS: readonly string[] = ['base'];

/** The smallest deposit the backend and the profile accept: 1 USD. */
const MINIMUM_DEPOSIT_CENTS = 100;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Integer cents of a deposit amount: decimal USD, at least 1, at most two
 * decimals. String arithmetic only, never a binary float. Undefined for any
 * amount the backend would refuse.
 */
export const depositAmountCents = (amount: string): number | undefined => {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/u.exec(amount);
  if (!match) {
    return undefined;
  }
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= MINIMUM_DEPOSIT_CENTS
    ? cents
    : undefined;
};

/** Whether the app may start a deposit with these parameters at all. */
export const isValidDepositParams = (params: PredictDepositParams): boolean =>
  depositAmountCents(params.amount) !== undefined &&
  UUID_V4.test(params.clientOperationId);

/**
 * The `funding.deposit` inputs for one deposit. They come from what the user
 * entered, never from the server: the server's sign request only has to
 * agree with them. Undefined when it does not, and nothing is signed.
 */
export const kalshiDepositSigningInputs = (
  params: Readonly<PredictDepositParams>,
  signRequest: Readonly<PredictDepositSignRequest>,
): TemplateInputs | undefined => {
  const amountCents = depositAmountCents(params.amount);
  if (
    amountCents === undefined ||
    !UUID_V4.test(params.clientOperationId) ||
    signRequest.amountCents !== amountCents ||
    signRequest.clientOperationId !== params.clientOperationId
  ) {
    return undefined;
  }
  return {
    amountCents,
    networks: DEPOSIT_NETWORKS,
    clientOperationId: params.clientOperationId,
  };
};
