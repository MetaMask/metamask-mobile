import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { OrderPreview } from '../../types';
import { PredictOrderRetryNoticeSelectorsIDs } from '../../Predict.testIds';
import {
  buildPredictRetryQuoteRows,
  getPredictRetryBody,
  getPredictRetryTitle,
  isPredictRetryQuoteVariant,
  type PredictOrderRetrySheetVariant,
} from './retryContent';

export interface PredictOrderRetryNoticeProps {
  variant: PredictOrderRetrySheetVariant;
  /** Refreshed quote shown by the 'confirm' and 'price_moved' variants. */
  preview?: OrderPreview | null;
  /** Price the user last confirmed, for the 'price_moved' body. */
  previousPrice?: number | null;
  /** Expected full share fill for sell confirmations. */
  expectedSize?: number | null;
  /** Ends the retry state. The close button is hidden when absent. */
  onDismiss?: () => void;
}

/**
 * Inline form of the order retry sheet for hosts that are already a bottom
 * sheet, where a second sheet would render inside the first one. The host's
 * main button runs the retry action.
 */
const PredictOrderRetryNotice = ({
  variant,
  preview,
  previousPrice,
  expectedSize = null,
  onDismiss,
}: PredictOrderRetryNoticeProps) => {
  const isQuoteShown = isPredictRetryQuoteVariant(variant, preview);
  const quoteRows = useMemo(
    () =>
      preview && isQuoteShown
        ? buildPredictRetryQuoteRows({ preview, expectedSize })
        : [],
    [preview, isQuoteShown, expectedSize],
  );
  const isFailed = variant === 'failed';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName={`mb-4 p-3 rounded-lg gap-3 ${
        isFailed ? 'bg-error-muted' : 'bg-warning-muted'
      }`}
      testID={PredictOrderRetryNoticeSelectorsIDs.CONTAINER}
    >
      <Icon
        name={isFailed ? IconName.Danger : IconName.Warning}
        color={isFailed ? IconColor.ErrorDefault : IconColor.WarningDefault}
        size={IconSize.Md}
      />
      <Box twClassName="flex-1 min-w-0 gap-2">
        <Text
          variant={TextVariant.BodyMd}
          color={isFailed ? TextColor.ErrorDefault : TextColor.WarningDefault}
          twClassName="font-medium"
          testID={PredictOrderRetryNoticeSelectorsIDs.TITLE}
        >
          {getPredictRetryTitle(variant)}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
          {getPredictRetryBody({
            variant,
            previousPrice,
            currentPrice: preview?.sharePrice,
          })}
        </Text>
        {quoteRows.map((row) => (
          <Box
            key={row.label}
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {row.label}
            </Text>
            <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
              {row.value}
            </Text>
          </Box>
        ))}
      </Box>
      {onDismiss && (
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onDismiss}
          testID={PredictOrderRetryNoticeSelectorsIDs.CLOSE_BUTTON}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        />
      )}
    </Box>
  );
};

export default PredictOrderRetryNotice;
