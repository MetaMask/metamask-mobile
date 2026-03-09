import React, { forwardRef } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { formatPrice } from '../../utils/format';
import { SLIPPAGE_BUY } from '../../providers/polymarket/constants';

interface PredictFeeBreakdownSheetProps {
  providerFee: number;
  metamaskFee: number;
  sharePrice: number;
  contractCount: number;
  betAmount: number;
  total: number;
  onClose?: () => void;
  fakOrdersEnabled?: boolean;
}

const PredictFeeBreakdownSheet = forwardRef<
  BottomSheetRef,
  PredictFeeBreakdownSheetProps
>(
  (
    {
      providerFee,
      metamaskFee,
      sharePrice,
      contractCount,
      betAmount,
      total,
      onClose,
      fakOrdersEnabled = false,
    },
    ref,
  ) => (
    <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
      <SheetHeader title={strings('predict.fee_summary.price_details')} />
      <Box twClassName="px-4 pb-6 flex-col">
        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
              {strings('predict.fee_summary.prediction_order')}
            </Text>
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyXs}
            >
              {strings('predict.fee_summary.prediction_order_description', {
                count: contractCount.toFixed(2),
                price: formatPrice(sharePrice, { maximumDecimals: 2 }),
                slippage: Math.round(SLIPPAGE_BUY * 100),
              })}
            </Text>
          </Box>
          <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
            {formatPrice(betAmount, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
              {strings('predict.fee_summary.metamask_fee')}
            </Text>
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyXs}
            >
              {strings('predict.fee_summary.metamask_fee_description')}
            </Text>
          </Box>
          <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
            {formatPrice(metamaskFee, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
              {strings('predict.fee_summary.exchange_fee')}
            </Text>
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyXs}
            >
              {strings('predict.fee_summary.exchange_fee_description')}
            </Text>
          </Box>
          <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
            {formatPrice(providerFee, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row justify-between items-center pt-4">
          <Text
            color={TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
          >
            {strings('predict.fee_summary.total')}
          </Text>
          <Text
            color={TextColor.TextDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
          >
            {formatPrice(total, { maximumDecimals: 2 })}
          </Text>
        </Box>

        {fakOrdersEnabled && (
          <Text
            testID="predict-fak-partial-fill-note"
            color={TextColor.TextAlternative}
            variant={TextVariant.BodyXs}
            twClassName="mt-3"
          >
            {strings('predict.fee_summary.fak_partial_fill_note')}
          </Text>
        )}
      </Box>
    </BottomSheet>
  ),
);

PredictFeeBreakdownSheet.displayName = 'PredictFeeBreakdownSheet';

export default PredictFeeBreakdownSheet;
