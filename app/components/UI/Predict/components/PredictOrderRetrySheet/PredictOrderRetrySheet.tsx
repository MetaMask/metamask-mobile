import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../locales/i18n';
import { formatCents } from '../../utils/format';
import { Side, type OrderPreview } from '../../types';
import { PredictOrderRetrySheetSelectorsIDs } from '../../Predict.testIds';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';
import {
  buildPredictRetryQuoteRows,
  getPredictRetryBody,
  getPredictRetryTitle,
  isPredictRetryQuoteVariant,
  type PredictOrderRetrySheetVariant,
} from './retryContent';

export type PredictOrderRetrySheetRef = PredictBottomSheetRef;

export type { PredictOrderRetrySheetVariant };

interface PredictOrderRetrySheetProps {
  variant: PredictOrderRetrySheetVariant;
  side: Side;
  /**
   * The refreshed quote the user is asked to confirm. Rendered by the
   * 'confirm' and 'price_moved' variants; must be the same preview that gets
   * submitted.
   */
  preview?: OrderPreview | null;
  /**
   * The price the user last confirmed, shown by the 'price_moved' variant so
   * the move from it to the fresh quote is explicit.
   */
  previousPrice?: number | null;
  /**
   * Expected full share fill for the refreshed quote (sell confirmations).
   * Read-only: partial execution is never offered.
   */
  expectedSize?: number | null;
  /** Fetches a fresh quote (retry entry point or "Try again"). */
  onRetry: () => void;
  /** Submits the confirmed refreshed quote. */
  onConfirm: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  /**
   * Hides every dismissal affordance (close button, backdrop press, swipe,
   * hardware back) while a pre-submit fetch or placement orchestration is
   * active. Dismissal is restored once the flow settles.
   */
  isDismissDisabled?: boolean;
}

function getConfirmLabelForSide(
  side: Side,
  preview: OrderPreview | null | undefined,
): string {
  const confirmKey =
    side === Side.BUY
      ? 'predict.order.yes_buy_at'
      : 'predict.order.yes_sell_at';
  return strings(confirmKey, {
    price: formatCents(preview?.sharePrice ?? 0),
  });
}

const PredictOrderRetrySheet = forwardRef<
  PredictOrderRetrySheetRef,
  PredictOrderRetrySheetProps
>(
  (
    {
      variant,
      side,
      preview,
      previousPrice,
      expectedSize = null,
      onRetry,
      onConfirm,
      onDismiss,
      isRetrying = false,
      isDismissDisabled = false,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const {
      sheetRef,
      isVisible,
      closeSheet,
      handleSheetClosed,
      getRefHandlers,
    } = usePredictBottomSheet({ onDismiss });

    useImperativeHandle(ref, getRefHandlers, [getRefHandlers]);

    const quoteRows = useMemo(
      () =>
        preview ? buildPredictRetryQuoteRows({ preview, expectedSize }) : [],
      [preview, expectedSize],
    );

    if (!isVisible) {
      return null;
    }

    const isFailed = variant === 'failed';
    const isBusy = variant === 'busy';
    const isNoMatch = variant === 'no_match' || variant === 'empty_book';
    const isQuoteShown = isPredictRetryQuoteVariant(variant, preview);

    const iconColor = isFailed
      ? IconColor.ErrorDefault
      : IconColor.WarningDefault;
    const iconBg = isFailed ? 'bg-error-muted' : 'bg-warning-muted';

    const title = getPredictRetryTitle(variant);
    const body = getPredictRetryBody({
      variant,
      previousPrice,
      currentPrice: preview?.sharePrice,
    });

    const buttonLabel = isQuoteShown
      ? getConfirmLabelForSide(side, preview)
      : strings('predict.order.retry');

    const showFooter = !isBusy;

    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={false}
        isInteractable={!isDismissDisabled}
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader
          onClose={isDismissDisabled ? undefined : closeSheet}
          closeButtonProps={{
            testID: PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON,
          }}
          style={tw.style('px-6 py-4')}
        />
        <Box
          testID={PredictOrderRetrySheetSelectorsIDs.CONTAINER}
          alignItems={BoxAlignItems.Center}
          twClassName="px-6 pb-8 pt-8 gap-4"
        >
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName={`h-12 w-12 rounded-full ${iconBg} justify-center`}
          >
            <Icon
              name={IconName.Warning}
              size={IconSize.Xl}
              color={iconColor}
            />
          </Box>
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {body}
          </Text>
          {isQuoteShown && (
            <Box twClassName="w-full gap-2 rounded-lg bg-background-muted p-4">
              {quoteRows.map((row) => (
                <Box
                  key={row.label}
                  flexDirection={BoxFlexDirection.Row}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {row.label}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    {row.value}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        {showFooter && (
          <BottomSheetFooter
            buttonPropsArray={[
              {
                variant: ButtonVariants.Primary,
                label: buttonLabel,
                onPress: isQuoteShown ? onConfirm : onRetry,
                testID: PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON,
                isDisabled: isRetrying,
                loading: isRetrying,
              },
              ...(isNoMatch
                ? [
                    {
                      variant: ButtonVariants.Secondary,
                      label: strings('predict.order.try_later'),
                      onPress: closeSheet,
                      testID:
                        PredictOrderRetrySheetSelectorsIDs.TRY_LATER_BUTTON,
                    },
                  ]
                : []),
            ]}
            style={tw.style('px-6')}
          />
        )}
      </BottomSheet>
    );
  },
);

PredictOrderRetrySheet.displayName = 'PredictOrderRetrySheet';

export default PredictOrderRetrySheet;
