import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  type BottomSheetRef,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useParams } from '../../../../../util/navigation/navUtils';
import styleSheet from './MoneyEarningsInfoSheet.styles';
import { MoneyEarningsInfoSheetTestIds } from './MoneyEarningsInfoSheet.testIds';

interface MoneyEarningsInfoSheetParams {
  apy: number;
}

const MoneyEarningsInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { apy } = useParams<MoneyEarningsInfoSheetParams>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGotItPress = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyEarningsInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.earnings_tooltip.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {strings('money.earnings_tooltip.lifetime_heading')}
          </Text>
          {'\n'}
          {strings('money.earnings_tooltip.lifetime_body')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {strings('money.earnings_tooltip.projected_heading')}
          </Text>
          {'\n'}
          {strings('money.earnings_tooltip.projected_body')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.earnings_tooltip.disclaimer', { percentage: apy })}
        </Text>
      </View>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('browser.got_it'),
          onPress: handleGotItPress,
          testID: MoneyEarningsInfoSheetTestIds.GOT_IT_BUTTON,
        }}
        twClassName="px-4 pt-6 pb-6"
      />
    </BottomSheet>
  );
};

export default MoneyEarningsInfoSheet;
