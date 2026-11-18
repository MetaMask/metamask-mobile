import { useCallback, useState } from 'react';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import type {
  PackPartnerNftStandard,
  PackPartnerSaleResult,
  PackPartnerAccount,
} from '../types';
import { formatUsdcAmount } from '../utils/format';
import { getErrorMessageFromUnknown } from '../utils/errorMessages';
import { showErrorToast, showSuccessToast } from '../../../hooks/toasts';
import { useUsdcBalance } from './useUsdcBalance';

export interface UseSellCardResult {
  /**
   * Sells the card back for at least `expectedAmount`, the USDC base-units
   * offer shown to the user. A lower or zero offer fails with `OFFER_CHANGED`
   * and refreshes the offer read. `nftStandard` is the card's standard, a hint
   * for the Snap's validation. Shows the result toast; resolves `undefined`
   * on failure.
   */
  sellCard: (
    mint: string,
    expectedAmount: string,
    nftStandard?: PackPartnerNftStandard,
  ) => Promise<PackPartnerSaleResult | undefined>;
  isSelling: boolean;
}

/** Instant buyback of a card, with toasts and a USDC balance refresh. */
export const useSellCard = (
  account: PackPartnerAccount | undefined,
): UseSellCardResult => {
  const { refresh: refreshBalance } = useUsdcBalance();
  const [isSelling, setIsSelling] = useState(false);

  const sellCard = useCallback(
    async (
      mint: string,
      expectedAmount: string,
      nftStandard?: PackPartnerNftStandard,
    ): Promise<PackPartnerSaleResult | undefined> => {
      if (!account) {
        return undefined;
      }
      setIsSelling(true);
      try {
        const result = await Engine.context.CollectiblesController.sellCard({
          account,
          mint,
          expectedAmount,
          ...(nftStandard ? { nftStandard } : {}),
        });
        showSuccessToast(
          strings('collectibles.toast.sold', {
            amount: formatUsdcAmount(result.amount),
          }),
        );
        refreshBalance().catch(() => undefined);
        return result;
      } catch (error) {
        showErrorToast(
          strings('collectibles.toast.sell_failed'),
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
