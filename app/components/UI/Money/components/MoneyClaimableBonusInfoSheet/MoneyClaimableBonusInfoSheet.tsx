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
import styleSheet from './MoneyClaimableBonusInfoSheet.styles';
import { MoneyClaimableBonusInfoSheetTestIds } from './MoneyClaimableBonusInfoSheet.testIds';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const MoneyClaimableBonusInfoSheet = () => {
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
          location: EVENT_LOCATIONS.PERCENTAGE_ROW,
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
      testID={MoneyClaimableBonusInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('earn.claimable_bonus')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          {strings('earn.claimable_bonus_tooltip')}{' '}
          <Text
            variant={TextVariant.BodyMd}
            style={styles.termsText}
            onPress={handleTermsPress}
            testID={MoneyClaimableBonusInfoSheetTestIds.TERMS_LINK}
          >
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      </View>
    </BottomSheet>
  );
};

export default MoneyClaimableBonusInfoSheet;
