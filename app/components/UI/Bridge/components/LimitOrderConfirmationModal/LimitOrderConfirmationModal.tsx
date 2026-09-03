import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {DetailRow} from './DetailRow';
import {TokenAmountValue} from './TokenAmountValue';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import type { LimitOrderConfirmationModalProps } from './types';

export const LimitOrderConfirmationModal = ({
  sourceToken,
  destToken,
  payingAmount,
  triggerPrice,
  triggerComparison,
  triggerToken,
  expiry,
  slippage,
  networkFee,
  feeToken,
  feeDisclaimer,
  onConfirm,
  onEditSlippagePress,
  onClose,
  goBack,
  testID = LimitOrderConfirmationModalSelectorsIDs.SHEET,
}: LimitOrderConfirmationModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const initialSlippageRef = useRef(slippage);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // If the user edits slippage while this sheet is still mounted, that quote is
  // stale until a new one is fetched, so close the sheet rather than show
  // outdated order details.
  useEffect(() => {
    if (slippage !== initialSlippageRef.current) {
      closeSheet();
    }
  }, [slippage, closeSheet]);

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
          testID: LimitOrderConfirmationModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.limit.pair', {
          source: sourceToken?.symbol ?? '',
          dest: destToken?.symbol ?? '',
        })}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        <DetailRow
          label={strings('bridge.limit.paying')}
        >
          <TokenAmountValue amount={payingAmount} token={sourceToken} />
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.receiving')}
        >
          <TokenAmountValue
            amount={destToken?.symbol ?? '--'}
            token={destToken}
          />
        </DetailRow>
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <DetailRow
          label={strings('bridge.limit.trigger_condition')}
        >
          <Box alignItems={BoxAlignItems.End} twClassName="shrink">
            <TokenAmountValue amount={triggerPrice} token={triggerToken} />
            {triggerComparison ? (
              <Text
                variant={TextVariant.BodySm}
                color={triggerComparisonColor}
                twClassName="text-right"
                testID={
                  LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON
                }
              >
                {triggerComparison.label}
              </Text>
            ) : null}
          </Box>
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.expiry_label')}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {expiry}
          </Text>
        </DetailRow>
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <DetailRow
          label={strings('bridge.slippage')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {slippage}
            </Text>
            <ButtonIcon
              iconName={IconName.Edit}
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconAlternative }}
              onPress={onEditSlippagePress}
              accessibilityLabel={strings('bridge.limit.edit_slippage')}
              testID={LimitOrderConfirmationModalSelectorsIDs.SLIPPAGE_EDIT}
            />
          </Box>
        </DetailRow>
        <DetailRow
          label={strings('bridge.limit.est_network_fee')}
        >
          <TokenAmountValue
            amount={networkFee}
            token={feeToken}
            withNetworkBadge
          />
        </DetailRow>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.limit.confirm_order'),
          onPress: onConfirm,
          testID: LimitOrderConfirmationModalSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
      {feeDisclaimer ? (
        <Box
          alignItems={BoxAlignItems.Center}
          paddingHorizontal={4}
          paddingBottom={4}
          twClassName="pt-1"
        >
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={LimitOrderConfirmationModalSelectorsIDs.FEE_DISCLAIMER}
          >
            {feeDisclaimer}
          </Text>
        </Box>
      ) : null}
    </BottomSheet>
  );
};
