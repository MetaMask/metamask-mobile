import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import styleSheet from './MoneyMoreSheet.styles';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';

interface MenuOption {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}

const MoneyMoreSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleHowItWorks = useCallback(() => {
    closeAndNavigate(() => {
      navigation.navigate(Routes.MONEY.HOW_IT_WORKS as never);
    });
  }, [closeAndNavigate, navigation]);

  const handleWhatYouGet = useCallback(() => {
    closeAndNavigate(() => {
      Linking.openURL(AppConstants.URLS.MUSD_LEARN_MORE);
    });
  }, [closeAndNavigate]);

  const handleContactSupport = useCallback(() => {
    closeAndNavigate(() => {
      Linking.openURL(METAMASK_SUPPORT_URL);
    });
  }, [closeAndNavigate]);

  const options: MenuOption[] = [
    {
      label: strings('money.more_sheet.how_it_works'),
      icon: IconName.Info,
      onPress: handleHowItWorks,
      testID: MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION,
    },
    {
      label: strings('money.more_sheet.what_you_get'),
      icon: IconName.Star,
      onPress: handleWhatYouGet,
      testID: MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION,
    },
    {
      label: strings('money.more_sheet.contact_support'),
      icon: IconName.MessageQuestion,
      onPress: handleContactSupport,
      testID: MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION,
    },
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyMoreSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('money.more_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.list}>
        {options.map((item) => (
          <TouchableOpacity
            key={item.testID}
            onPress={item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Icon
              name={item.icon}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

export default MoneyMoreSheet;
