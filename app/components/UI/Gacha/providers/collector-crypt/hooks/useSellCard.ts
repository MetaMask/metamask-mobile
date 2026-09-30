import { useCallback, useState } from 'react';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import type { CollectorCryptSaleResult, SolanaAccountRef } from '../types';
import { formatUsdcAmount } from '../utils/format';
import { getErrorMessageFromUnknown } from '../utils/errorMessages';
import { showErrorToast, showSuccessToast } from '../../../hooks/toasts';
import { useUsdcBalance } from './useUsdcBalance';

export interface UseSellCardResult {
  /** Sells the card back. Shows the result toast; resolves `undefined` on failure. */
  sellCard: (mint: string) => Promise<CollectorCryptSaleResult | undefined>;
  isSelling: boolean;
}

/** Instant buyback of a card, with toasts and a USDC balance refresh. */
export const useSellCard = (
  account: SolanaAccountRef | undefined,
): UseSellCardResult => {
  const { refresh: refreshBalance } = useUsdcBalance();
  const [isSelling, setIsSelling] = useState(false);

  const sellCard = useCallback(
    async (mint: string): Promise<CollectorCryptSaleResult | undefined> => {
      if (!account) {
        return undefined;
      }
      setIsSelling(true);
      try {
        const result = await Engine.context.GachaController.sellCard({
          account,
          mint,
        });
        showSuccessToast(
          strings('gacha.toast.sold', {
            amount: formatUsdcAmount(result.amount),
          }),
        );
        refreshBalance().catch(() => undefined);
        return result;
      } catch (error) {
        showErrorToast(
          strings('gacha.toast.sell_failed'),
          getErrorMessageFromUnknown(error),
        );
        return undefined;
      } finally {
        setIsSelling(false);
      }
    },
    [account, refreshBalance],
  );

  return { sellCard, isSelling };
};
