import React, { useCallback, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { DetailRow } from '../LimitOrderConfirmationModal/DetailRow';
import { TokenAmountValue } from '../LimitOrderConfirmationModal/TokenAmountValue';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';
import type { OpenLimitOrderDetailsModalProps } from './types';

export const OpenLimitOrderDetailsModal = ({
  sourceToken,
  destToken,
  status,
  submittedAmount,
  triggerPrice,
  triggerToken,
  triggerComparison,
  expiry,
  onCancelOrder,
  onClose,
  goBack,
  testID = OpenLimitOrderDetailsModalSelectorsIDs.SHEET,
}: OpenLimitOrderDetailsModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const triggerComparisonColor = triggerComparison?.isNegative
    ? TextColor.ErrorDefault
    : TextColor.SuccessDefault;

  return (
    <BottomSheet
      ref={sheetRef}
      testID={testID}
      goBack={goBack}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: OpenLimitOrderDetailsModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.pair', {
          source: sourceToken?.symbol ?? '',
          dest: destToken?.symbol ?? '',
        })}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        <DetailRow
          label={strings('bridge.limit.status')}
          testID={OpenLimitOrderDetailsModalSelectorsIDs.STATUS}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {status}
          </Text>
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.submitted')}
          testID={OpenLimitOrderDetailsModalSelectorsIDs.SUBMITTED}
        >
          <TokenAmountValue amount={submittedAmount} token={sourceToken} />
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.trigger_condition')}
          testID={OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_CONDITION}
        >
          <Box alignItems={BoxAlignItems.End} twClassName="shrink">
            <TokenAmountValue amount={triggerPrice} token={triggerToken} />
            {triggerComparison ? (
              <Text
                variant={TextVariant.BodySm}
                color={triggerComparisonColor}
                twClassName="text-right"
                testID={OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_COMPARISON}
              >
                {triggerComparison.label}
              </Text>
            ) : null}
          </Box>
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.expiry_label')}
          testID={OpenLimitOrderDetailsModalSelectorsIDs.EXPIRY}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {expiry}
          </Text>
        </DetailRow>
      </Box>
      <BottomSheetFooter
        secondaryButtonProps={{
          children: strings('bridge.limit.cancel_order'),
          onPress: onCancelOrder,
          isDanger: true,
          testID: OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON,
        }}
      />
    </BottomSheet>
  );
};
