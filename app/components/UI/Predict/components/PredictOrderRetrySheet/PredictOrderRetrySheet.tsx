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
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { strings } from '../../../../../../locales/i18n';
import { formatCents, formatPrice } from '../../utils/format';
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
import { TouchableOpacity } from 'react-native';

export type PredictOrderRetrySheetRef = PredictBottomSheetRef;

export type PredictOrderRetrySheetVariant =
  | 'busy'
  | 'confirm'
  | 'failed'
  | 'quote_unavailable';

interface PredictOrderRetrySheetProps {
  variant: PredictOrderRetrySheetVariant;
  side: Side;
  /**
   * The refreshed quote the user is asked to confirm. Rendered by the
   * 'confirm' variant; must be the same preview that gets submitted.
   */
  preview?: OrderPreview | null;
  /** Fetches a fresh quote (retry entry point or "Try again"). */
  onRetry: () => void;
  /** Submits the confirmed refreshed quote. */
  onConfirm: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

const PRICE_FORMAT = { minimumDecimals: 2, maximumDecimals: 2 };

function getTitleForVariant(variant: PredictOrderRetrySheetVariant): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_title');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_title');
    default:
      return strings('predict.order.market_busy_title');
  }
}

function getBodyForVariant(variant: PredictOrderRetrySheetVariant): string {
  switch (variant) {
    case 'failed':
      return strings('predict.order.order_failed_body');
    case 'quote_unavailable':
      return strings('predict.order.price_unavailable_body');
    case 'busy':
      return strings('predict.order.getting_price_body');
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
      onRetry,
      onConfirm,
      onDismiss,
      isRetrying = false,
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
      const bandPercent = `${preview.slippage * 100}%`;
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
    }, [preview]);

    if (!isVisible) {
      return null;
    }

    const isFailed = variant === 'failed';
    const isConfirm = variant === 'confirm' && !!preview;
    const isBusy = variant === 'busy';

    const iconColor = isFailed
      ? IconColor.ErrorDefault
      : IconColor.WarningDefault;
    const iconBg = isFailed ? 'bg-error-muted' : 'bg-warning-muted';

    const title = getTitleForVariant(variant);
    const body = getBodyForVariant(variant);

    const buttonLabel = isConfirm
      ? getConfirmLabelForSide(side, preview)
      : strings('predict.order.try_again');

    const showFooter = !isBusy;

    return (
      <BottomSheet
        ref={sheetRef}
        shouldNavigateBack={false}
        isInteractable
        onClose={handleSheetClosed}
      >
        <TouchableOpacity
          testID={PredictOrderRetrySheetSelectorsIDs.CLOSE_BUTTON}
          onPress={closeSheet}
          style={tw.style('absolute top-8 right-4 z-10')}
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
        </TouchableOpacity>
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
          {isConfirm && (
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
                onPress: isConfirm ? onConfirm : onRetry,
                testID: PredictOrderRetrySheetSelectorsIDs.RETRY_BUTTON,
                isDisabled: isRetrying,
                loading: isRetrying,
              },
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
