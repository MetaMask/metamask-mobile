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
import {
  formatCents,
  formatPositionSize,
  formatPrice,
} from '../../utils/format';
import {
  getPredictExchangeFee,
  getPredictSellNetProceeds,
  getPredictSellWorstCaseProceeds,
} from '../../utils/orders';
import { getMinAmountReceivedWithSlippage } from '../../providers/polymarket/protocol/slippage';
import { Side, type OrderPreview } from '../../types';
import { PredictOrderRetrySheetSelectorsIDs } from '../../Predict.testIds';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';

export type PredictOrderRetrySheetRef = PredictBottomSheetRef;

export type PredictOrderRetrySheetVariant =
  | 'busy'
  | 'confirm'
  | 'price_moved'
  | 'failed'
  | 'quote_unavailable'
  | 'no_match'
  | 'timeout';

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

const PRICE_FORMAT = { minimumDecimals: 2, maximumDecimals: 2 };

function getTitleForVariant(variant: PredictOrderRetrySheetVariant): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_title');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_title');
    case 'price_moved':
      return strings('predict.order.price_moved_title');
    case 'no_match':
      return strings('predict.order.no_match_title');
    case 'timeout':
      return strings('predict.order.market_timeout_title');
    default:
      return strings('predict.order.market_busy_title');
  }
}

function getBodyForVariant({
  variant,
  previousPrice,
  currentPrice,
}: {
  variant: PredictOrderRetrySheetVariant;
  previousPrice: number | null | undefined;
  currentPrice: number | null | undefined;
}): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_body');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_body');
    case 'no_match':
      return strings('predict.order.no_match_body');
    case 'timeout':
      return strings('predict.order.market_timeout_body');
    case 'busy':
      return strings('predict.order.getting_price_body');
    case 'price_moved':
      return strings('predict.order.price_moved_body', {
        previousPrice: formatCents(previousPrice ?? 0),
        currentPrice: formatCents(currentPrice ?? 0),
      });
    default:
      return strings('predict.order.price_updated_body');
  }
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

    const quoteRows = useMemo(() => {
      if (!preview) {
        return [];
      }
      const feesTotal =
        (preview.fees?.metamaskFee ?? 0) + getPredictExchangeFee(preview.fees);
      // `preview.slippage * 100` picks up float noise for some values
      // (e.g. 0.07 * 100 → 7.000000000000001): format through a fixed
      // precision and strip trailing zeros so the label reads '7%'
      // while a genuine 0.5% band is preserved.
      const bandPercent = `${parseFloat((preview.slippage * 100).toFixed(2))}%`;
      const priceRow = {
        label: strings('predict.order.retry_price_label'),
        value: formatCents(preview.sharePrice),
      };
      const worstCaseRow = {
        label: strings('predict.order.retry_worst_case_label', {
          band: bandPercent,
        }),
        value:
          preview.side === Side.SELL
            ? formatPrice(getPredictSellWorstCaseProceeds(preview), {
                ...PRICE_FORMAT,
              })
            : formatPrice(getMinAmountReceivedWithSlippage(preview), {
                ...PRICE_FORMAT,
              }),
      };
      const feesRow = {
        label: strings('predict.order.retry_fees_label'),
        value: formatPrice(feesTotal, { ...PRICE_FORMAT }),
      };

      if (preview.side === Side.SELL) {
        return [
          priceRow,
          // Read-only expected full fill; partial execution is never offered.
          ...(expectedSize !== null
            ? [
                {
                  label: strings('predict.order.retry_expected_fill_label'),
                  value: strings('predict.order.retry_expected_fill_value', {
                    shares: formatPositionSize(expectedSize, {
                      minimumDecimals: 2,
                      maximumDecimals: 2,
                    }),
                  }),
                },
              ]
            : []),
          {
            label: strings('predict.order.retry_proceeds_label'),
            value: formatPrice(getPredictSellNetProceeds(preview), {
              ...PRICE_FORMAT,
            }),
          },
          worstCaseRow,
          feesRow,
        ];
      }
      return [
        priceRow,
        {
          label: strings('predict.order.retry_payout_label'),
          value: formatPrice(preview.minAmountReceived, { ...PRICE_FORMAT }),
        },
        worstCaseRow,
        feesRow,
      ];
    }, [preview, expectedSize]);

    if (!isVisible) {
      return null;
    }

    const isFailed = variant === 'failed';
    const isBusy = variant === 'busy';
    const isNoMatch = variant === 'no_match';
    const isQuoteShown =
      (variant === 'confirm' || variant === 'price_moved') && !!preview;

    const iconColor = isFailed
      ? IconColor.ErrorDefault
      : IconColor.WarningDefault;
    const iconBg = isFailed ? 'bg-error-muted' : 'bg-warning-muted';

    const title = getTitleForVariant(variant);
    const body = getBodyForVariant({
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
