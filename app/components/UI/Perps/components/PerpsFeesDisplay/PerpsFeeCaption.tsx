import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsFeeDiscountKind } from '../../utils/feeDiscount';
import PerpsFeeDiscountLabel from './PerpsFeeDiscountLabel';
import { SEAL_PERCENT_ICON_SIZE } from './SealPercentIcon';

/**
 * Null-byte sentinels stand in for the rates inside one translated sentence.
 * They cannot appear in locale copy, so a match is the placeholder itself.
 * The percent sign stays in that sentence, which lets a translation place it
 * before the number and control the surrounding word order.
 */
const ORIGINAL_RATE_PLACEHOLDER = '\u0000originalFeePercentage\u0000';
const DISCOUNTED_RATE_PLACEHOLDER = '\u0000feePercentage\u0000';
const ORIGINAL_RATE_KEY = 'original-fee-rate';
const DISCOUNTED_RATE_KEY = 'discounted-fee-rate';
const PROMO_RATE_SPLIT = new RegExp(
  `(${ORIGINAL_RATE_PLACEHOLDER}|${DISCOUNTED_RATE_PLACEHOLDER})`,
);

/**
 * Copy slices are identified by their text. A repeated slice gets an
 * occurrence suffix so two identical fragments do not share a key, without
 * using the list index.
 */
const promoCopyKey = (segment: string, occurrence: number): string =>
  occurrence === 0 ? segment : `${segment}\u0000${occurrence}`;

interface PerpsFeeCaptionProps {
  feePercentage: string;
  /** Pre-discount combined rate, shown struck through for a promo. */
  originalFeePercentage?: string;
  bridgeFee?: string;
  feeDiscountPercentage?: number;
  feeDiscountKind?: PerpsFeeDiscountKind;
  testID: string;
  twClassName?: string;
}

const promoSentenceKey = (
  hasOriginalRate: boolean,
  hasBridgeFee: boolean,
): string => {
  if (hasOriginalRate && hasBridgeFee) {
    return 'perps.trade_sheet.includes_fee_after_promo_with_bridge';
  }
  if (hasOriginalRate) {
    return 'perps.trade_sheet.includes_fee_after_promo';
  }
  if (hasBridgeFee) {
    return 'perps.trade_sheet.includes_fee_after_promo_discounted_with_bridge';
  }
  return 'perps.trade_sheet.includes_fee_after_promo_discounted';
};

/**
 * Replaces rate sentinels with styled text and leaves every other character,
 * including percent signs, in the translated sentence.
 */
const promoSentenceNodes = (
  template: string,
  feePercentage: string,
  originalFeePercentage?: string,
): React.ReactNode[] => {
  const copyOccurrence = new Map<string, number>();

  return template
    .split(PROMO_RATE_SPLIT)
    .filter((segment) => segment !== '')
    .map((segment) => {
      if (segment === ORIGINAL_RATE_PLACEHOLDER) {
        return (
          <Text
            key={ORIGINAL_RATE_KEY}
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="line-through"
          >
            {originalFeePercentage}
          </Text>
        );
      }
      if (segment === DISCOUNTED_RATE_PLACEHOLDER) {
        return (
          <Text
            key={DISCOUNTED_RATE_KEY}
            variant={TextVariant.BodyXs}
            color={TextColor.SuccessDefault}
          >
            {feePercentage}
          </Text>
        );
      }
      const occurrence = copyOccurrence.get(segment) ?? 0;
      copyOccurrence.set(segment, occurrence + 1);
      return (
        <Text
          key={promoCopyKey(segment, occurrence)}
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
        >
          {segment}
        </Text>
      );
    });
};

const PerpsFeeCaption = ({
  feePercentage,
  originalFeePercentage,
  bridgeFee,
  feeDiscountPercentage,
  feeDiscountKind,
  testID,
  twClassName,
}: PerpsFeeCaptionProps) => {
  const isPromotionalDiscount =
    feeDiscountKind === 'promotional' &&
    feeDiscountPercentage !== undefined &&
    feeDiscountPercentage > 0;
  const showOriginalRate =
    isPromotionalDiscount &&
    originalFeePercentage !== undefined &&
    originalFeePercentage !== feePercentage;

  const standardCopy = bridgeFee
    ? strings('perps.trade_sheet.includes_fee_with_bridge', {
        feePercentage,
        bridgeFee,
      })
    : strings('perps.trade_sheet.includes_fee', { feePercentage });

  const promoCopy = strings(
    promoSentenceKey(showOriginalRate, Boolean(bridgeFee)),
    {
      originalFeePercentage: ORIGINAL_RATE_PLACEHOLDER,
      feePercentage: DISCOUNTED_RATE_PLACEHOLDER,
      bridgeFee,
    },
  );
  // Strikethrough is visual only. Name the previous rate when it is shown.
  let promoAccessibilityLabel: string | undefined;
  if (showOriginalRate) {
    promoAccessibilityLabel = bridgeFee
      ? strings('perps.trade_sheet.includes_fee_after_promo_a11y_with_bridge', {
          feePercentage,
          originalFeePercentage,
          bridgeFee,
        })
      : strings('perps.trade_sheet.includes_fee_after_promo_a11y', {
          feePercentage,
          originalFeePercentage,
        });
  }

  return (
    <Box
      accessible={false}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName={twClassName}
    >
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={feeDiscountPercentage}
        feeDiscountKind={feeDiscountKind}
        iconSize={SEAL_PERCENT_ICON_SIZE.caption}
      />
      {isPromotionalDiscount ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          accessibilityLabel={promoAccessibilityLabel}
          testID={testID}
          twClassName="tabular-nums"
        >
          {promoSentenceNodes(promoCopy, feePercentage, originalFeePercentage)}
        </Text>
      ) : (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          testID={testID}
          twClassName="tabular-nums"
        >
          {standardCopy}
        </Text>
      )}
    </Box>
  );
};

export default PerpsFeeCaption;
