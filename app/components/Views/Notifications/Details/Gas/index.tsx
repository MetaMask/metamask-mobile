import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { networkFeeDetails } from '../../utils';

const GasDetails = ({
  sheetRef,
  transaction,
  styles,
  onClosed,
}: {
  sheetRef: React.RefObject<BottomSheetRef>;
  transaction: Transaction;
  styles: any;
  onClosed: () => void;
}) => (
  <BottomSheet ref={sheetRef} shouldNavigateBack={false} onClose={onClosed}>
    <View style={styles.gasDetails}>
      {Object.keys(networkFeeDetails).map((key) => (
        <View key={key} style={styles.row}>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings(key)}
          </Text>
          <Text
            color={TextColor.Alternative}
            style={styles.boxRight}
            variant={TextVariant.BodyMD}
          >
            {transaction[networkFeeDetails[key] as keyof Transaction]}
          </Text>
        </View>
      ))}
    </View>
  </BottomSheet>
);

export default GasDetails;
