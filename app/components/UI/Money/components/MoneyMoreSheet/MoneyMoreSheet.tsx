import React, { useCallback, useRef } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
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
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import finishSetupIcon from '../../../../../images/money-finish-setup-clock.png';

interface MenuOption {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
  showDot?: boolean;
  useFinishSetupIcon?: boolean;
}

const MoneyMoreSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});
  const {
    advanceTwoWeeks,
    isTwoWeeksLater,
    isVisible: isFinishSetupVisible,
    resetProgress,
  } = useMoneyFinishSetup();

  const { trackBottomSheetViewed, trackSurfaceClicked } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
  });
  const { openSupportWithConsent } = useSupportConsent();

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

  const handleManageSecurity = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_MANAGE_SECURITY,
      redirect_target: SCREEN_NAMES.MONEY_MANAGE_SECURITY,
    });

    closeAndNavigate(() => {
      navigation.navigate(Routes.MONEY.MANAGE_SECURITY);
    });
  }, [closeAndNavigate, navigation, trackSurfaceClicked]);

  const handleContactSupport = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_CONTACT_SUPPORT,
      redirect_target: MONEY_URLS.METAMASK_SUPPORT,
    });

    openSupportWithConsent(
      (url) => closeAndNavigate(() => openInAppBrowser(navigation, url)),
      METAMASK_SUPPORT_URL,
    );
  }, [
    closeAndNavigate,
    navigation,
    trackSurfaceClicked,
    openSupportWithConsent,
  ]);

  const handleRefreshPrototype = useCallback(() => {
    closeAndNavigate(resetProgress);
  }, [closeAndNavigate, resetProgress]);

  const handleAdvanceTwoWeeks = useCallback(() => {
    closeAndNavigate(advanceTwoWeeks);
  }, [advanceTwoWeeks, closeAndNavigate]);

  const handleFinishSetup = useCallback(() => {
    closeAndNavigate(() => {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.FINISH_SETUP_SHEET,
      });
    });
  }, [closeAndNavigate, navigation]);

  const options: MenuOption[] = [
    {
      label: strings('money.more_sheet.how_it_works'),
      icon: IconName.Book,
      onPress: handleHowItWorks,
      testID: MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION,
    },
    ...(isTwoWeeksLater && isFinishSetupVisible
      ? [
          {
            label: strings('money.finish_setup.card.title'),
            icon: IconName.Clock,
            onPress: handleFinishSetup,
            testID: MoneyMoreSheetTestIds.FINISH_SETUP_OPTION,
            showDot: true,
            useFinishSetupIcon: true,
          },
        ]
      : []),
    {
      label: strings('money.more_sheet.manage_security'),
      icon: IconName.SecurityTick,
      onPress: handleManageSecurity,
      testID: MoneyMoreSheetTestIds.MANAGE_SECURITY_OPTION,
    },
    {
      label: strings('money.more_sheet.what_you_get'),
      icon: IconName.Export,
      onPress: handleWhatYouGet,
      testID: MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION,
    },
    {
      label: strings('money.more_sheet.contact_support'),
      icon: IconName.Sms,
      onPress: handleContactSupport,
      testID: MoneyMoreSheetTestIds.CONTACT_SUPPORT_OPTION,
    },
    {
      label: strings('money.more_sheet.refresh_prototype'),
      icon: IconName.Refresh,
      onPress: handleRefreshPrototype,
      testID: MoneyMoreSheetTestIds.REFRESH_OPTION,
    },
    {
      label: strings('money.more_sheet.two_weeks_later_prototype'),
      icon: IconName.Calendar,
      onPress: handleAdvanceTwoWeeks,
      testID: MoneyMoreSheetTestIds.TWO_WEEKS_LATER_OPTION,
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
            <Box style={styles.iconContainer} twClassName="bg-background-muted">
              {item.useFinishSetupIcon ? (
                <Image
                  source={finishSetupIcon}
                  style={styles.customIcon}
                  testID={MoneyMoreSheetTestIds.FINISH_SETUP_ICON}
                />
              ) : (
                <Icon
                  name={item.icon}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              )}
              {item.showDot && (
                <View
                  style={styles.notificationDot}
                  testID={MoneyMoreSheetTestIds.FINISH_SETUP_DOT}
                />
              )}
            </Box>
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
