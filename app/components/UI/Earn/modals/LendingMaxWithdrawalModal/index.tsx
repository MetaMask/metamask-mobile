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
          <Text variant={TextVariant.HeadingSM}>
            {`Why can't I withdraw my full balance?`}
          </Text>
        </BottomSheetHeader>
        <View style={styles.bodyTextContainer}>
          <Text>{`This wallet has active borrow positions made outside of this app, such as through Aave’s website.`}</Text>
          <Text>{`To keep your position safe, we limit withdrawals to avoid lowering your health factor too much, which could put your assets at risk of liquidation.`}</Text>
          <Text>
            {`To unlock more withdrawals, repay some of your borrowed assets or increase your collateral.`}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
};

export default LendingMaxWithdrawalModal;
