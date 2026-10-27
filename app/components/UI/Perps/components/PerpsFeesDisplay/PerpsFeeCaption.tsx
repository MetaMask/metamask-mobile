import React from 'react';
import { StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});

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

  const promoTail = bridgeFee
    ? strings('perps.trade_sheet.includes_fee_after_promo_tail_with_bridge', {
        bridgeFee,
      })
    : strings('perps.trade_sheet.includes_fee_after_promo_tail');

  return (
    <Box
      accessible={false}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={2}
      twClassName={twClassName}
      testID={testID}
    >
      <PerpsFeeDiscountLabel
        feeDiscountPercentage={feeDiscountPercentage}
        feeDiscountKind={feeDiscountKind}
        iconSize={SEAL_PERCENT_ICON_SIZE.caption}
      />
      {isPromotionalDiscount ? (
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {`${strings('perps.trade_sheet.includes_fee_after_promo_lead')} `}
          {showOriginalRate ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              style={styles.strikethrough}
            >
              {`${originalFeePercentage}%`}
            </Text>
          ) : null}
          {showOriginalRate ? ' ' : null}
          <Text variant={TextVariant.BodyXs} color={TextColor.SuccessDefault}>
            {`${feePercentage}%`}
          </Text>
          {` ${promoTail}`}
        </Text>
      ) : (
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {standardCopy}
        </Text>
      )}
    </Box>
  );
};

export default PerpsFeeCaption;
