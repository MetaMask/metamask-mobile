import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useParams } from '../../../../../util/navigation/navUtils';
import styleSheet from './MoneyApyInfoSheet.styles';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';

interface MoneyApyInfoSheetParams {
  apy: number;
}

const MoneyApyInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { apy } = useParams<MoneyApyInfoSheetParams>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyApyInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.apy_tooltip.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_1', { percentage: apy })}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_2')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.apy_tooltip.paragraph_3')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyApyInfoSheet;
