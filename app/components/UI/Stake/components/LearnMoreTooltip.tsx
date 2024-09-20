import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const createStyles = () =>
  StyleSheet.create({
    container: {
      padding: 16,
      alignItems: 'center',
    },
  });

const LearnMoreTooltip = () => {
  const styles = createStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMDMedium}>
          {'In progress: Learn more about pooled staking'}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default LearnMoreTooltip;
