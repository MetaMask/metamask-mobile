import React, { useCallback, useRef } from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  type BottomSheetRef,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import AppConstants from '../../../../../core/AppConstants';
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

  const handleLearnMorePress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
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
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('money.apy_tooltip.learn_more'),
          onPress: handleLearnMorePress,
          testID: MoneyApyInfoSheetTestIds.LEARN_MORE_BUTTON,
        }}
        twClassName="px-4 pt-6 pb-6"
      />
    </BottomSheet>
  );
};

export default MoneyApyInfoSheet;
