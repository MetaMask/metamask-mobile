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
          <Text variant={TextVariant.HeadingMD}>
            {`Why can't I withdraw my full balance?`}
          </Text>
        </BottomSheetHeader>
        <View style={styles.bodyTextContainer}>
          <Text>{`There are a few reasons why you might not be able to withdraw everything right now:
`}</Text>
          <Text variant={TextVariant.HeadingMD}>{`Not enough liquidity`}</Text>
          <Text>{`The lending pool doesn't have enough available funds for your withdrawal amount. Try withdrawing a smaller amount or wait for more liquidity.`}</Text>
          <Text variant={TextVariant.HeadingMD}>{`Insufficient balance`}</Text>
          <Text>
            {`You're trying to withdraw more than you actually have deposited. Double-check your available balance.`}
          </Text>
          <Text
            variant={TextVariant.HeadingMD}
          >{`Health factor protection`}</Text>
          <Text>
            {`Withdrawing too much would put your borrowed assets at risk of liquidation. This safety check protects you from losing your collateral. If you have borrowed assets, consider repaying your debt to increase the amount withdrawable.`}
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
};

export default LendingMaxWithdrawalModal;
