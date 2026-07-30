import React, { useCallback, useRef } from 'react';
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
  FontWeight,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
  TitleHub,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { usePerpsHomeActions } from '../../hooks/usePerpsHomeActions';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import {
  formatPercentage,
  formatPerpsBalance,
  formatPnl,
} from '../../utils/formatUtils';
import PerpsBottomSheetTooltip from '../PerpsBottomSheetTooltip';
import { PerpsBalanceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { PerpsBalanceBottomSheetProps } from './PerpsBalanceBottomSheet.types';

/**
 * Perps account balance bottom sheet.
 *
 * Shows total balance, available balance, and unrealized P&L, with quick
 * access to Withdraw / Add funds and Perps activity history. Opened from the
 * wallet icon in the Pro market header without leaving the market screen.
 */
const PerpsBalanceBottomSheet: React.FC<PerpsBalanceBottomSheetProps> = ({
  isVisible,
  onClose,
  testID = PerpsBalanceBottomSheetSelectorsIDs.CONTAINER,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const privacyMode = useSelector(selectPrivacyMode);
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const { navigateToActivity } = usePerpsNavigation();

  const {
    handleAddFunds,
    handleWithdraw,
    isEligibilityModalVisible,
    closeEligibilityModal,
  } = usePerpsHomeActions({
    buttonLocation: PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS,
  });

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

  const handleHistoryPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      navigateToActivity();
    });
  }, [navigateToActivity]);

  // Withdraw/Add funds both navigate away (to the withdraw screen or into a
  // confirmation flow), so close the sheet first — same as History above —
  // instead of leaving it mounted underneath the next screen.
  const handleWithdrawPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      handleWithdraw();
    });
  }, [handleWithdraw]);

  const handleAddFundsPress = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      handleAddFunds();
    });
  }, [handleAddFunds]);

  if (!isVisible) return null;

  return (
    <>
      <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
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
                  variant={TextVariant.DisplayLg}
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

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <ButtonIcon
                size={ButtonIconSize.Md}
                iconName={IconName.Activity}
                onPress={handleHistoryPress}
                accessibilityLabel={strings(
                  'perps.balance_bottom_sheet.history_button',
                )}
                testID={PerpsBalanceBottomSheetSelectorsIDs.HISTORY_BUTTON}
              />
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
      </BottomSheet>

      {isEligibilityModalVisible && (
        // Android Compatibility: Wrap the <Modal> in a plain <View> component to prevent rendering issues and freezing.
        <View>
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <PerpsBottomSheetTooltip
              isVisible
              onClose={closeEligibilityModal}
              contentKey="geo_block"
              testID={
                PerpsBalanceBottomSheetSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP
              }
            />
          </Modal>
        </View>
      )}
    </>
  );
};

export default React.memo(PerpsBalanceBottomSheet);
