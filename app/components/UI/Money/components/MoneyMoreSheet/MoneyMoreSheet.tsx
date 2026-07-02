import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import AppConstants from '../../../../../core/AppConstants';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import styleSheet from './MoneyMoreSheet.styles';
import { openInAppBrowser } from '../../utils/openInAppBrowser';
import { MoneyMoreSheetTestIds } from './MoneyMoreSheet.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

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
  const surfaceClass = useElevatedSurface();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const closeAndNavigate = useCallback((navigateFn: () => void) => {
    sheetRef.current?.onCloseBottomSheet(navigateFn);
  }, []);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleHowItWorks = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_HOW_IT_WORKS,
      redirect_target: SCREEN_NAMES.MONEY_HOW_IT_WORKS,
    });

    closeAndNavigate(() => {
      navigation.navigate(Routes.MONEY.HOW_IT_WORKS as never);
    });
  }, [closeAndNavigate, navigation, trackSurfaceClicked]);

  const handleWhatYouGet = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_WHAT_YOU_GET,
      redirect_target: MONEY_URLS.MONEY_LANDING,
    });

    closeAndNavigate(() => {
      openInAppBrowser(navigation, AppConstants.URLS.MONEY_LANDING);
    });
  }, [closeAndNavigate, navigation, trackSurfaceClicked]);

  const handleContactSupport = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_CONTACT_SUPPORT,
      redirect_target: MONEY_URLS.METAMASK_SUPPORT,
    });

    closeAndNavigate(() => {
      Linking.openURL(METAMASK_SUPPORT_URL);
    });
  }, [closeAndNavigate, trackSurfaceClicked]);

  const options: MenuOption[] = [
    {
      label: strings('money.more_sheet.how_it_works'),
      icon: IconName.Book,
      onPress: handleHowItWorks,
      testID: MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION,
    },
    {
      label: strings('money.more_sheet.what_you_get'),
      icon: IconName.Export,
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
      twClassName={surfaceClass}
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
