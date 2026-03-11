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

interface FeeRowProps {
  title: string;
  description: string;
  amount: string;
}

const FeeRow = ({ title, description, amount }: FeeRowProps) => (
  <>
    <Box twClassName="flex-row items-start py-4">
      <Box twClassName="flex-1 pr-4 gap-1">
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {title}
        </Text>
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyXs}>
          {description}
        </Text>
      </Box>
      <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
        {amount}
      </Text>
    </Box>
    <Box twClassName="border-t border-muted" />
  </>
);

interface PredictFeeBreakdownSheetProps {
  providerFee: number;
  metamaskFee: number;
  depositFee?: number;
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
      depositFee,
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
        <FeeRow
          title={strings('predict.fee_summary.prediction_order')}
          description={strings(
            'predict.fee_summary.prediction_order_description',
            {
              count: contractCount.toFixed(2),
              price: formatPrice(sharePrice, { maximumDecimals: 2 }),
              slippage: Math.round(SLIPPAGE_BUY * 100),
            },
          )}
          amount={formatPrice(betAmount, { maximumDecimals: 2 })}
        />

        <FeeRow
          title={strings('predict.fee_summary.metamask_fee')}
          description={strings('predict.fee_summary.metamask_fee_description')}
          amount={formatPrice(metamaskFee, { maximumDecimals: 2 })}
        />

        <FeeRow
          title={strings('predict.fee_summary.exchange_fee')}
          description={strings('predict.fee_summary.exchange_fee_description')}
          amount={formatPrice(providerFee, { maximumDecimals: 2 })}
        />

        {depositFee && (
          <>
            <Box twClassName="flex-row items-start py-4">
              <Box twClassName="flex-1 pr-4 gap-1">
                <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
                  {strings('predict.fee_summary.deposit_fee')}
                </Text>
                <Text
                  color={TextColor.Alternative}
                  variant={TextVariant.BodyXS}
                >
                  {strings('predict.fee_summary.deposit_fee_description')}
                </Text>
              </Box>
              <Text color={TextColor.Default} variant={TextVariant.BodyMD}>
                {formatPrice(depositFee, { maximumDecimals: 2 })}
              </Text>
            </Box>

            <Box twClassName="border-t border-muted" />
          </>
        )}

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
