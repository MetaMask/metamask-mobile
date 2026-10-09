import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import DottedUnderline from '../../../DottedUnderline';
import { LimitOrderCostToleranceTooltip } from '../LimitOrderCostToleranceTooltip';
import { DetailRow } from './DetailRow';
import { TokenAmountValue } from './TokenAmountValue';
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
  costTolerance,
  delegationFee,
  feeToken,
  usdExchangeRate,
  primaryButton,
  error,
  onClose,
  goBack,
  testID = LimitOrderConfirmationModalSelectorsIDs.SHEET,
}: LimitOrderConfirmationModalProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const initialCostToleranceRef = useRef(costTolerance);

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleFeeDisclaimerPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_ACCOUNT_UPGRADE_FEE_INFO_MODAL,
    });
  }, [navigation]);

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
      {usdExchangeRate && (
        <Box paddingHorizontal={3} paddingBottom={2}>
          <BannerAlert
            descriptionProps={{
              variant: TextVariant.BodySm,
              color: TextColor.TextDefault,
            }}
            severity={BannerAlertSeverity.Info}
            description={strings('bridge.limit.usd_price_notice', {
              rate: usdExchangeRate.rate,
              currency: usdExchangeRate.currency,
            })}
            testID={LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE}
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
        <Box twClassName="mx-4 my-2 h-px bg-border-muted" />
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
        <Box twClassName="mx-4 my-2 h-px bg-border-muted" />
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
            <Box twClassName="mx-4 my-2 h-px bg-border-muted" />
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
          isDisabled: primaryButton.isDisabled,
        }}
      />
      <Box
        alignItems={BoxAlignItems.Center}
        paddingHorizontal={4}
        paddingBottom={4}
        twClassName="pt-1"
      >
        <Pressable
          onPress={handleFeeDisclaimerPress}
          accessibilityRole="button"
          accessibilityLabel={strings('bridge.limit.includes_metamask_fee')}
          style={({ pressed }) => pressed && tw.style('opacity-50')}
          testID={LimitOrderConfirmationModalSelectorsIDs.FEE_DISCLAIMER}
        >
          <DottedUnderline color={colors.text.alternative}>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('bridge.limit.includes_metamask_fee')}
            </Text>
          </DottedUnderline>
        </Pressable>
      </Box>
    </BottomSheet>
  );
};
