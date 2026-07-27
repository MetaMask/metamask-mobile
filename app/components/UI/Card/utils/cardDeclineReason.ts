import { strings } from '../../../../../locales/i18n';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MONEY_ACCOUNT_DELEGATION_TOKEN_KEY } from '../util/vedaToken';

const DECLINE_ATTEMPT_PATTERN =
  /you attempted this\s+([A-Z0-9-]+)\s+transaction with a balance of\s+[\d.,]+\s+([A-Z0-9]+)/i;

export interface DeclineAttempt {
  network: string;
  symbol: string;
}

export function parseDeclineAttempt(
  message?: string,
): DeclineAttempt | undefined {
  if (!message) {
    return undefined;
  }
  const match = DECLINE_ATTEMPT_PATTERN.exec(message);
  if (!match) {
    return undefined;
  }
  return {
    network: match[1].toUpperCase(),
    symbol: match[2].toUpperCase(),
  };
}

export function isMoneyAccountDecline(tx: CardTransaction): boolean {
  const attempt = parseDeclineAttempt(tx.declineReason?.message);
  if (!attempt) {
    return false;
  }
  return (
    attempt.network === 'MONAD' &&
    attempt.symbol === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY.toUpperCase()
  );
}

export function getCardDeclineReasonLabel(
  tx?: CardTransaction,
): string | undefined {
  const message = tx?.declineReason?.message;
  if (!message) {
    return undefined;
  }
  if (parseDeclineAttempt(message)) {
    return strings('card.transactions.decline_reasons.insufficient_funds');
  }
  return message;
}
