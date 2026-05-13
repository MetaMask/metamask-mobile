import React, { useCallback, useRef } from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import AppConstants from '../../../../../core/AppConstants';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import styleSheet from './MoneyConvertInfoSheet.styles';
import { MoneyConvertInfoSheetTestIds } from './MoneyConvertInfoSheet.testIds';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const MoneyConvertInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTermsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED)
        .addProperties({
          location: EVENT_LOCATIONS.CUSTOM_AMOUNT_NAVBAR,
          url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
        })
        .build(),
    );
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, [createEventBuilder, trackEvent]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyConvertInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          {strings('earn.musd_conversion.convert_tooltip_description', {
            percentage: MUSD_CONVERSION_APY,
          })}{' '}
          <Text
            variant={TextVariant.BodyMd}
            style={styles.termsText}
            onPress={handleTermsPress}
            testID={MoneyConvertInfoSheetTestIds.TERMS_LINK}
          >
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyConvertInfoSheet;
