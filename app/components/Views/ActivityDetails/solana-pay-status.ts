import type { MetamaskPayIntent } from '@metamask/transaction-controller';
import { strings } from '../../../../locales/i18n';

export function getSolanaPayStatusLabel(
  intent: MetamaskPayIntent | undefined,
): string | undefined {
  if (!intent?.sourceChainId.startsWith('solana:')) {
    return undefined;
  }

  if (intent.outcome?.type === 'unknown') {
    return strings('confirm.solana_pay.status_unavailable');
  }

  if (intent.outcome?.type === 'refunded') {
    return strings('confirm.solana_pay.refunded');
  }

  return undefined;
}
