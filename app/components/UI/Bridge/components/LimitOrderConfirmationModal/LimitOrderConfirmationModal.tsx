import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderCostToleranceTooltip } from '../LimitOrderCostToleranceTooltip';
import { DetailRow } from './DetailRow';
import { TokenAmountValue } from './TokenAmountValue';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import type { LimitOrderConfirmationModalProps } from './types';
import { LIMIT_ORDER_DEFAULT_METAMASK_FEE } from '../../constants/limitOrders';

export const LimitOrderConfirmationModal = ({
  sourceToken,
  destToken,
  payingAmount,
  triggerPrice,
  triggerComparison,
  triggerToken,
  expiry,
  costTolerance,
  delegationFee,
  feeToken,
  primaryButton,
  error,
  onClose,
  goBack,
  testID = LimitOrderConfirmationModalSelectorsIDs.SHEET,
}: LimitOrderConfirmationModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const initialCostToleranceRef = useRef(costTolerance);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  // If the user edits the cost tolerance while this sheet is still mounted,
  // that quote is stale until a new one is fetched, so close the sheet rather
  // than show outdated order details.
  useEffect(() => {
    if (costTolerance !== initialCostToleranceRef.current) {
      closeSheet();
    }
  }, [costTolerance, closeSheet]);

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
      {error && (
        <Box paddingHorizontal={3} paddingBottom={2}>
          <BannerAlert
            descriptionProps={{
              variant: TextVariant.BodySm,
              color: TextColor.TextDefault,
            }}
            severity={BannerAlertSeverity.Danger}
            description={error}
          />
        </Box>
      )}
      <Box paddingBottom={2}>
        <DetailRow label={strings('bridge.limit.paying')}>
          <TokenAmountValue amount={payingAmount} token={sourceToken} />
        </DetailRow>
        <DetailRow label={strings('bridge.limit.receiving')}>
          <TokenAmountValue
            amount={destToken?.symbol ?? '--'}
            token={destToken}
          />
        </DetailRow>
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <DetailRow label={strings('bridge.limit.trigger_condition')}>
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
        <DetailRow label={strings('bridge.limit.expiry_label')}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {expiry}
          </Text>
        </DetailRow>
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <DetailRow
          label={strings('bridge.cost_tolerance')}
          labelAccessory={
            <LimitOrderCostToleranceTooltip
              testID={
                LimitOrderConfirmationModalSelectorsIDs.COST_TOLERANCE_TOOLTIP
              }
            />
          }
          testID={LimitOrderConfirmationModalSelectorsIDs.COST_TOLERANCE}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {costTolerance}
            </Text>
          </Box>
        </DetailRow>
        {(delegationFee.status === 'ready' ||
          delegationFee.status === 'error') && (
          <>
            <Box twClassName="mx-4 my-2 h-px bg-muted" />
            <DetailRow
              label={strings('bridge.limit.est_network_fee')}
              testID={LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE}
              error={delegationFee.status === 'error'}
            >
              <TokenAmountValue
                amount={
                  delegationFee.status === 'ready'
                    ? delegationFee.displayFee
                    : '--'
                }
                token={feeToken}
                error={delegationFee.status === 'error'}
                withNetworkBadge
              />
            </DetailRow>
          </>
        )}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: primaryButton.label,
          onPress: primaryButton.onPress,
          testID: LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON,
          isLoading: primaryButton.isLoading,
        }}
      />
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
          {strings('bridge.fee_disclaimer', {
            feePercentage: LIMIT_ORDER_DEFAULT_METAMASK_FEE,
          })}
        </Text>
      </Box>
    </BottomSheet>
  );
};
