import React, { forwardRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
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
    },
    ref,
  ) => (
    <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
      <SheetHeader title={strings('predict.fee_summary.price_details')} />
      <Box twClassName="px-4 pb-6 flex-col">
        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
              {strings('predict.fee_summary.prediction_order')}
            </Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyXS}>
              {strings('predict.fee_summary.prediction_order_description', {
                count: contractCount.toFixed(2),
                price: formatPrice(sharePrice, { maximumDecimals: 2 }),
                slippage: Math.round(SLIPPAGE_BUY * 100),
              })}
            </Text>
          </Box>
          <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
            {formatPrice(betAmount, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
              {strings('predict.fee_summary.metamask_fee')}
            </Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyXS}>
              {strings('predict.fee_summary.metamask_fee_description')}
            </Text>
          </Box>
          <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
            {formatPrice(metamaskFee, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row items-start py-4">
          <Box twClassName="flex-1 pr-4 gap-1">
            <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
              {strings('predict.fee_summary.exchange_fee')}
            </Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyXS}>
              {strings('predict.fee_summary.exchange_fee_description')}
            </Text>
          </Box>
          <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
            {formatPrice(providerFee, { maximumDecimals: 2 })}
          </Text>
        </Box>

        <Box twClassName="border-t border-muted" />

        <Box twClassName="flex-row justify-between items-center pt-4">
          <Text color={TextColor.Default} variant={TextVariant.BodyMDBold}>
            {strings('predict.fee_summary.total')}
          </Text>
          <Text color={TextColor.Default} variant={TextVariant.BodyMDBold}>
            {formatPrice(total, { maximumDecimals: 2 })}
          </Text>
        </Box>
      </Box>
    </BottomSheet>
  ),
);

PredictFeeBreakdownSheet.displayName = 'PredictFeeBreakdownSheet';

export default PredictFeeBreakdownSheet;
