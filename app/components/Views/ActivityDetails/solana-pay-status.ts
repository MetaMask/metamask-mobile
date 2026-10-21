import type { MetamaskPaySolanaExecution } from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';
import { getSolanaPayOutcome } from '../../../util/transactions/solana-pay';

export function getSolanaPayStatusLabel(
  execution: MetamaskPaySolanaExecution | undefined,
): string | undefined {
  if (!execution) {
    return undefined;
  }

  const outcome = getSolanaPayOutcome(execution);
  if (outcome === 'unknown') {
    return strings('confirm.solana_pay.status_unavailable');
  }
  if (outcome === 'refunded') {
    return strings('confirm.solana_pay.refunded');
  }
  return undefined;
}
