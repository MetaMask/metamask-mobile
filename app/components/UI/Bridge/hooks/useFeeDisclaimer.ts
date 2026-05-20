import { BRIDGE_MM_FEE_RATE, QuoteResponse } from '@metamask/bridge-controller';
import { isNullOrUndefined } from '@metamask/utils';
import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';

/**
 * Checks if the fee is discounted and returns the appropriate strings to display in the fee disclaimer.

* @param activeQuote - The active quote from the bridge controller
 * @returns An object containing the following properties:
 * - showVipBadge: boolean - Whether to show the VIP badge
 * - infoText: string - The text to display in the fee disclaimer
 * - infoSuffix: string - The suffix to display in the fee disclaimer
 * - baseFeePercentage: string - The base fee percentage to display in the fee disclaimer
 */
export const useFeeDisclaimer = ({
  activeQuote,
}: {
  activeQuote?: QuoteResponse | null;
}) => {
  // @ts-expect-error: controller types are not up to date yet
  const baseBpsFee = activeQuote?.quote.feeData.metabridge?.baseBpsFee;
  const baseFeePercentage = !isNullOrUndefined(baseBpsFee)
    ? baseBpsFee / 100
    : undefined;
  // TODO: remove this once controller types are updated
  // @ts-expect-error: controller types are not up to date yet
  const quoteBpsFee = activeQuote?.quote.feeData.metabridge?.quoteBpsFee;
  const feePercentage = !isNullOrUndefined(quoteBpsFee)
    ? quoteBpsFee / 100
    : undefined;

  const hasFee =
    activeQuote && feePercentage !== undefined && feePercentage > 0;

  const isDiscounted =
    activeQuote &&
    Boolean(baseBpsFee) &&
    Boolean(quoteBpsFee) &&
    baseBpsFee > quoteBpsFee;

  const infoText = useMemo(() => {
    if (isDiscounted) {
      return strings('bridge.fee_includes');
    }

    if (hasFee) {
      return strings('bridge.fee_disclaimer', {
        feePercentage,
      });
    }

    if (!activeQuote) {
      return undefined;
    }

    return strings('bridge.no_mm_fee_disclaimer', {
      destTokenSymbol: activeQuote.quote.destAsset.symbol,
    });
  }, [isDiscounted, hasFee, activeQuote, feePercentage]);

  return {
    showVipBadge: isDiscounted,
    infoText,
    infoSuffix: isDiscounted
      ? strings('bridge.fee_percentage_meta_mask', {
          feePercentage,
        })
      : undefined,
    baseFeePercentage: isDiscounted
      ? strings('bridge.fee_percentage', {
          feePercentage: baseFeePercentage ?? BRIDGE_MM_FEE_RATE,
        })
      : undefined,
  };
};
