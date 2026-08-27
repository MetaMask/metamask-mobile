import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  ButtonIconSize,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './LendingMaxWithdrawalModal.styles';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

const LendingMaxWithdrawalModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation<AppNavigationProp>();

  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleGoBack = useCallback(() => {
    if (navigation.isFocused()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <View>
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{ size: ButtonIconSize.Lg }}
          twClassName="min-h-14 h-auto px-4"
        >
          <Text variant={TextVariant.HeadingSm}>
            {strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.why_cant_i_withdraw_full_balance',
            )}
          </Text>
        </BottomSheetHeader>
        <View style={styles.bodyTextContainer}>
          <Text>{`${strings(
            'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.your_withdrawal_amount_may_be_limited_by',
          )}:`}</Text>
          <Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
            >{`• ${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.pool_liquidity',
            )}:`}</Text>{' '}
            {`${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.not_enough_funds_available_in_the_lending_pool_right_now',
            )}`}
          </Text>
          <Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
            >{`• ${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.existing_borrow_positions',
            )}:`}</Text>{' '}
            {`${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.withdrawing_could_put_your_existing_loans_at_risk_of_liquidation',
            )}`}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
};

export default LendingMaxWithdrawalModal;
