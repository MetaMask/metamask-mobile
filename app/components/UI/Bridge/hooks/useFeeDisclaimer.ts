import {
  BRIDGE_MM_FEE_RATE,
  DiscountType,
  QuoteResponseV2,
} from '@metamask/bridge-controller';
import { isNullOrUndefined } from '@metamask/utils';
import { useMemo } from 'react';
import { strings } from '../../../../../locales/i18n';

/**
 * Checks if the fee is discounted and returns the appropriate strings to display in the fee disclaimer.

* @param activeQuote - The active quote from the bridge controller
 * @returns An object containing the following properties:
 * - discountBadge - The discount badge to show
 * - infoText: string - The text to display in the fee disclaimer
 * - infoSuffix: string - The suffix to display in the fee disclaimer
 * - baseFeePercentage: string - The base fee percentage to display in the fee disclaimer
 */
export const useFeeDisclaimer = ({
  activeQuote,
}: {
  activeQuote?: QuoteResponseV2 | null;
}) => {
  const baseBpsFee = activeQuote?.quote.feeData.metabridge?.baseBpsFee;
  const baseFeePercentage = !isNullOrUndefined(baseBpsFee)
    ? baseBpsFee / 100
    : BRIDGE_MM_FEE_RATE;
  const quoteBpsFee = activeQuote?.quote.feeData.metabridge?.quoteBpsFee;
  const feePercentage = !isNullOrUndefined(quoteBpsFee)
    ? quoteBpsFee / 100
    : BRIDGE_MM_FEE_RATE;
  const discountType = activeQuote?.quote.feeData.metabridge?.discountType;
  const hasDiscountType =
    !isNullOrUndefined(discountType) && discountType !== '';

  const hasFee = activeQuote && feePercentage > 0;

  const isDiscounted =
    activeQuote &&
    hasDiscountType &&
    Boolean(baseBpsFee) &&
    !isNullOrUndefined(quoteBpsFee) &&
    baseBpsFee > quoteBpsFee;

  const discountBadge = useMemo(() => {
    if (!hasDiscountType) {
      return undefined;
    }

    if (discountType === DiscountType.VIP) {
      return { type: DiscountType.VIP };
    }

    if (discountType === DiscountType.DAO) {
      return {
        type: DiscountType.DAO,
        label: strings('bridge.discount_badge_dao'),
      };
    }

    return {
      type: DiscountType.PROMO,
      label: strings('bridge.discount_badge_promo'),
    };
  }, [discountType, hasDiscountType]);

  const infoText = useMemo(() => {
    if (isDiscounted) {
      return;
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
    discountBadge,
    infoText,
    infoSuffix: isDiscounted
      ? strings('bridge.fee_percentage_meta_mask', {
          feePercentage,
        })
      : undefined,
    baseFeePercentage: isDiscounted
      ? strings('bridge.fee_percentage', {
          feePercentage: baseFeePercentage,
        })
      : undefined,
  };
};
