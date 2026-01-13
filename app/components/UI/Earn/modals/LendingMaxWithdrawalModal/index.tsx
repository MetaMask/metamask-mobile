import React, { useRef } from 'react';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './LendingMaxWithdrawalModal.styles';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

const LendingMaxWithdrawalModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View>
        <BottomSheetHeader onClose={handleClose}>
          {strings(
            'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.why_cant_i_withdraw_full_balance',
          )}
        </BottomSheetHeader>
        <View style={styles.bodyTextContainer}>
          <Text>{`${strings(
            'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.your_withdrawal_amount_may_be_limited_by',
          )}:`}</Text>
          <Text>
            <Text variant={TextVariant.BodyMDMedium}>{`• ${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.pool_liquidity',
            )}:`}</Text>{' '}
            {`${strings(
              'earn.tooltip_content.lending_risk_aware_withdrawal_tooltip.not_enough_funds_available_in_the_lending_pool_right_now',
            )}`}
          </Text>
          <Text>
            <Text variant={TextVariant.BodyMDMedium}>{`• ${strings(
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
