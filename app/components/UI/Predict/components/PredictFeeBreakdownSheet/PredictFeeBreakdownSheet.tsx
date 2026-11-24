import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Modal, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../locales/i18n';
import { formatPrice } from '../../utils/format';
import { SLIPPAGE_BUY } from '../../providers/polymarket/constants';
import type { PredictFeePolicy } from '../../types';
import PredictFeeTotal from '../PredictFeeTotal/PredictFeeTotal';

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
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
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
  originalTotal?: number;
  feePolicy?: PredictFeePolicy;
  depositFee?: number;
  sharePrice: number;
  contractCount: number;
  betAmount: number;
  total: number;
  slippage?: number;
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
      originalTotal,
      feePolicy,
      sharePrice,
      depositFee,
      contractCount,
      betAmount,
      total,
      slippage = SLIPPAGE_BUY,
      onClose,
      fakOrdersEnabled = false,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const sheetRef = useRef<BottomSheetRef>(null);

    useImperativeHandle(
      ref,
      () => ({
        onOpenBottomSheet: (callback) => {
          sheetRef.current?.onOpenBottomSheet(callback);
        },
        onCloseBottomSheet: (callback) => {
          sheetRef.current?.onCloseBottomSheet(callback);
        },
      }),
      [],
    );

    const handleClose = useCallback(() => {
      sheetRef.current?.onCloseBottomSheet();
    }, []);

    return (
      // Full-window modal so the preview sheet cannot clip the rounded top.
      // The fee sheet is taller than that parent, and the parent hides overflow.
      <View pointerEvents="box-none" style={tw.style('absolute h-0 w-0')}>
        <Modal
          visible
          transparent
          animationType="none"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={handleClose}
          testID="predict-fee-breakdown-modal"
        >
          <ModalSafeAreaProvider>
            <GestureHandlerRootView style={tw.style('flex-1')}>
              <BottomSheet
                ref={sheetRef}
                isInteractable
                onClose={onClose}
                testID="predict-fee-breakdown-sheet"
              >
                <BottomSheetHeader
                  onClose={handleClose}
                  closeButtonProps={{ testID: 'predict-fee-breakdown-close' }}
                  textProps={{ testID: 'predict-fee-breakdown-header' }}
                  // The built-in header height clips the title against the sheet's
                  // top radius. Release it and keep a taller minimum instead.
                  twClassName="h-auto min-h-16"
                  testID="predict-fee-breakdown-header-bar"
                >
                  {strings('predict.fee_summary.price_details')}
                </BottomSheetHeader>
                <Box twClassName="px-4 pb-6 flex-col">
                  <FeeRow
                    title={strings('predict.fee_summary.prediction_order')}
                    description={strings(
                      'predict.fee_summary.prediction_order_description',
                      {
                        count: contractCount.toFixed(2),
                        price: formatPrice(sharePrice, { maximumDecimals: 2 }),
                        slippage: Math.round(slippage * 100),
                      },
                    )}
                    amount={formatPrice(betAmount, { maximumDecimals: 2 })}
                  />

                  <FeeRow
                    title={strings('predict.fee_summary.metamask_fee')}
                    description={strings(
                      'predict.fee_summary.metamask_fee_description',
                    )}
                    amount={formatPrice(metamaskFee, { maximumDecimals: 2 })}
                  />

                  <FeeRow
                    title={strings('predict.fee_summary.exchange_fee')}
                    description={strings(
                      'predict.fee_summary.exchange_fee_description',
                    )}
                    amount={formatPrice(providerFee, {
                      maximumDecimals: 2,
                    })}
                  />

                  {depositFee && (
                    <>
                      <Box twClassName="flex-row items-start py-4">
                        <Box twClassName="flex-1 pr-4 gap-1">
                          <Text
                            color={TextColor.TextDefault}
                            variant={TextVariant.BodyMd}
                          >
                            {strings('predict.fee_summary.deposit_fee')}
                          </Text>
                          <Text
                            color={TextColor.TextAlternative}
                            variant={TextVariant.BodySm}
                          >
                            {strings(
                              'predict.fee_summary.deposit_fee_description',
                            )}
                          </Text>
                        </Box>
                        <Text
                          color={TextColor.TextDefault}
                          variant={TextVariant.BodyMd}
                        >
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
                    <PredictFeeTotal
                      total={total}
                      originalTotal={originalTotal}
                      feePolicy={feePolicy}
                      fontWeight={FontWeight.Bold}
                    />
                  </Box>

                  {fakOrdersEnabled && (
                    <Text
                      testID="predict-fak-partial-fill-note"
                      color={TextColor.TextAlternative}
                      variant={TextVariant.BodySm}
                    >
                      {strings('predict.fee_summary.fak_partial_fill_note')}
                    </Text>
                  )}
                </Box>
              </BottomSheet>
            </GestureHandlerRootView>
          </ModalSafeAreaProvider>
        </Modal>
      </View>
    );
  },
);

PredictFeeBreakdownSheet.displayName = 'PredictFeeBreakdownSheet';

export default PredictFeeBreakdownSheet;
