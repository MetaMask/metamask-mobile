import React, { useCallback, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonsAlignment,
  FontFamily,
  FontWeight,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
  TitleHub,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { usePerpsHomeActions } from '../../hooks/usePerpsHomeActions';
import { usePerpsCrossMarginSummary } from '../../hooks/usePerpsCrossMarginSummary';
import {
  formatPercentage,
  formatPerpsBalance,
  formatPnl,
} from '../../utils/formatUtils';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsInlineInfoScreen } from '../PerpsInlineInfoScreen/PerpsInlineInfoScreen';
import PerpsAccountUnsupportedModal from '../PerpsAccountUnsupportedModal';
import { PerpsBalanceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { PerpsBalanceBottomSheetProps } from './PerpsBalanceBottomSheet.types';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import PerpsCrossMarginSummary, {
  type PerpsCrossMarginSummaryTooltipKey,
} from './PerpsCrossMarginSummary';

/**
 * Perps account balance bottom sheet.
 *
 * Shows total balance, available balance, and unrealized P&L, with quick
 * access to Withdraw / Add funds. When the account holds cross margin
 * exposure it also shows the cross margin metrics. Opened from the wallet
 * icon in the Pro market header and from the Perps home balance.
 */
const PerpsBalanceBottomSheet: React.FC<PerpsBalanceBottomSheetProps> = ({
  isVisible,
  onClose,
  buttonLocation,
  testID = PerpsBalanceBottomSheetSelectorsIDs.CONTAINER,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const privacyMode = useSelector(selectPrivacyMode);
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const {
    hasCrossExposure,
    accountRatio,
    maintenanceMargin,
    accountLeverage,
    crossMarginUsage,
    tone,
  } = usePerpsCrossMarginSummary({ enabled: isVisible });
  const [activeTooltip, setActiveTooltip] =
    useState<PerpsCrossMarginSummaryTooltipKey | null>(null);
  const closeTooltip = useCallback(() => setActiveTooltip(null), []);
  const handleInfoPress = useCallback(
    (key: PerpsCrossMarginSummaryTooltipKey) => {
      setActiveTooltip(key);
    },
    [],
  );

  const {
    handleAddFunds,
    handleWithdraw,
    isEligible,
    isEligibilityModalVisible,
    closeEligibilityModal,
    isAccountUnsupportedModalVisible,
    closeAccountUnsupportedModal,
  } = usePerpsHomeActions({ buttonLocation });

  const totalBalance = perpsAccount?.totalBalance || '0';
  const spendableBalance = perpsAccount?.spendableBalance || '0';
  const unrealizedPnl = parseFloat(perpsAccount?.unrealizedPnl || '0');
  const roe = parseFloat(perpsAccount?.returnOnEquity || '0');

  const pnlColor = privacyMode
    ? TextColor.TextDefault
    : unrealizedPnl > 0
      ? TextColor.SuccessDefault
      : unrealizedPnl < 0
        ? TextColor.ErrorDefault
        : TextColor.TextDefault;

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  // Every dismissal (close button, swipe, backdrop, hardware back, and the
  // Withdraw / Add funds actions) ends here. Pro market keeps this component
  // mounted, so clear the explanation or the next open would show it instead
  // of the account summary.
  const handleSheetClose = useCallback(() => {
    setActiveTooltip(null);
    onClose();
  }, [onClose]);

  // Withdraw always navigates away (to the withdraw screen or into a
  // confirmation flow), so close the sheet first instead of leaving it
  // mounted underneath the next screen.
  const handleWithdrawPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      handleWithdraw();
    });
  }, [handleWithdraw]);

  const handleAddFundsPress = useCallback(() => {
    if (!isEligible) {
      // Geo-blocked users never navigate — handleAddFunds only shows the
      // eligibility tooltip below, in place. That tooltip's visibility is
      // gated behind `isVisible` (see the early return below), so closing
      // the sheet first would set `isVisible` to false before the tooltip
      // ever gets a chance to render.
      handleAddFunds();
      return;
    }

    bottomSheetRef.current?.onCloseBottomSheet(() => {
      handleAddFunds();
    });
  }, [isEligible, handleAddFunds]);

  if (!isVisible) return null;

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        onClose={handleSheetClose}
        testID={testID}
      >
        {activeTooltip ? (
          <PerpsInlineInfoScreen
            contentKey={activeTooltip}
            onBack={closeTooltip}
            buttonLocation={buttonLocation}
          />
        ) : (
          <>
            <Box twClassName="w-full pt-2 pb-3">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Start}
                gap={3}
                twClassName="w-full px-4"
              >
                <TitleHub
                  twClassName="flex-1 py-2"
                  title={strings('perps.title')}
                  amount={
                    <SensitiveText
                      variant={TextVariant.AmountDisplayLg}
                      fontFamily={FontFamily.Hero}
                      color={TextColor.TextDefault}
                      isHidden={privacyMode}
                      length={SensitiveTextLength.Medium}
                      testID={PerpsBalanceBottomSheetSelectorsIDs.BALANCE_VALUE}
                    >
                      {formatPerpsBalance(totalBalance)}
                    </SensitiveText>
                  }
                  amountWrapperProps={{ twClassName: 'w-full' }}
                  bottomLabel={
                    <Box
                      flexDirection={BoxFlexDirection.Row}
                      alignItems={BoxAlignItems.Center}
                      gap={6}
                    >
                      <Box>
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                        >
                          {strings('perps.balance_bottom_sheet.available')}
                        </Text>
                        <SensitiveText
                          variant={TextVariant.BodySm}
                          fontWeight={FontWeight.Medium}
                          color={TextColor.TextDefault}
                          isHidden={privacyMode}
                          length={SensitiveTextLength.Short}
                          testID={
                            PerpsBalanceBottomSheetSelectorsIDs.AVAILABLE_VALUE
                          }
                        >
                          {formatPerpsBalance(spendableBalance)}
                        </SensitiveText>
                      </Box>

                      <Box>
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                        >
                          {strings('perps.unrealized_pnl')}
                        </Text>
                        <SensitiveText
                          variant={TextVariant.BodySm}
                          fontWeight={FontWeight.Medium}
                          color={pnlColor}
                          isHidden={privacyMode}
                          length={SensitiveTextLength.Short}
                          testID={PerpsBalanceBottomSheetSelectorsIDs.PNL_VALUE}
                        >
                          {`${formatPnl(unrealizedPnl)} (${formatPercentage(roe, 1)})`}
                        </SensitiveText>
                      </Box>
                    </Box>
                  }
                  bottomLabelWrapperProps={{ twClassName: 'w-full' }}
                />

                <Box alignItems={BoxAlignItems.Center}>
                  <ButtonIcon
                    size={ButtonIconSize.Md}
                    iconName={IconName.Close}
                    onPress={handleClose}
                    accessibilityLabel={strings(
                      'perps.balance_bottom_sheet.close_button',
                    )}
                    testID={PerpsBalanceBottomSheetSelectorsIDs.CLOSE_BUTTON}
                  />
                </Box>
              </Box>
            </Box>

            {hasCrossExposure && (
              <PerpsCrossMarginSummary
                accountRatio={accountRatio}
                maintenanceMargin={maintenanceMargin}
                accountLeverage={accountLeverage}
                crossMarginUsage={crossMarginUsage}
                accountRatioTone={tone}
                privacyMode={privacyMode}
                onInfoPress={handleInfoPress}
              />
            )}

            <BottomSheetFooter
              buttonsAlignment={ButtonsAlignment.Horizontal}
              secondaryButtonProps={{
                children: strings('perps.withdraw'),
                onPress: handleWithdrawPress,
                size: ButtonSize.Lg,
                testID: PerpsBalanceBottomSheetSelectorsIDs.WITHDRAW_BUTTON,
              }}
              primaryButtonProps={{
                children: strings('perps.add_funds'),
                onPress: handleAddFundsPress,
                size: ButtonSize.Lg,
                testID: PerpsBalanceBottomSheetSelectorsIDs.ADD_FUNDS_BUTTON,
              }}
            />
          </>
        )}
      </BottomSheet>

      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <ModalSafeAreaProvider>
              <PerpsBottomSheetTooltip
                isVisible
                onClose={closeEligibilityModal}
                contentKey="geo_block"
                testID={
                  PerpsBalanceBottomSheetSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP
                }
              />
            </ModalSafeAreaProvider>
          </Modal>
        </View>
      )}

      <PerpsAccountUnsupportedModal
        isVisible={isAccountUnsupportedModalVisible}
        onClose={closeAccountUnsupportedModal}
      />
    </>
  );
};

export default React.memo(PerpsBalanceBottomSheet);
