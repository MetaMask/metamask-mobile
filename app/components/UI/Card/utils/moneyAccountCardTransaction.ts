import { strings } from '../../../../../locales/i18n';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../util/vedaToken';

/**
 * Baanx insufficient-funds decline copy only. Immersve (and future providers)
 * do not use this template yet — extend with structured decline fields when
 * available. This regex can break if Baanx changes the message wording.
 */
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

/** Provider-specific (Baanx decline copy); extend here for Immersve. */
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

export function isMoneyAccountCardTransaction(tx: CardTransaction): boolean {
  if (tx.fundingSources.length === 0) {
    return isMoneyAccountDecline(tx);
  }
  return tx.fundingSources.some(
    (fs) =>
      fs.currency?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY &&
      fs.chainId === MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  );
}

export function getCardDeclineReasonLabel(
  tx?: CardTransaction,
): string | undefined {
  const message = tx?.declineReason?.message;
  if (message) {
    if (parseDeclineAttempt(message)) {
      return strings('card.transactions.decline_reasons.insufficient_funds');
    }
    return message;
  }
  // Immersve only provides a machine code (e.g. "cvv-invalid"); humanize it.
  const code = tx?.declineReason?.code?.replace(/[-_]+/g, ' ').trim();
  if (!code) {
    return undefined;
  }
  return code.charAt(0).toUpperCase() + code.slice(1);
}
