import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Switch,
  Text,
  TextColor,
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
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import useMountEffect from '../../hooks/useMountEffect';
import { useMoneyMfa } from '../../hooks/useMoneyMfa';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
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
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});

  const { trackBottomSheetViewed, trackSurfaceClicked, trackButtonClicked } =
    useMoneyAnalytics({
      bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
    });
  const { openSupportWithConsent } = useSupportConsent();

  useMountEffect(trackBottomSheetViewed);

  const { status: mfaStatus, turnOn: turnOnMfa } = useMoneyMfa();
  const isMfaOn = mfaStatus === 'enabled';

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

  const handleMfaToggle = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: isMfaOn
        ? MONEY_BUTTON_INTENTS.DISABLE_MFA
        : MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.more_sheet_title',
      component_name: COMPONENT_NAMES.MONEY_MORE_SHEET_MFA_TOGGLE,
      ...(isMfaOn && {
        redirect_target: BOTTOM_SHEET_NAMES.MONEY_MFA_TURN_OFF_SHEET,
      }),
    });
    sheetRef.current?.onCloseBottomSheet(() => {
      if (isMfaOn) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
        });
      } else {
        void turnOnMfa();
      }
    });
  }, [isMfaOn, navigation, trackButtonClicked, turnOnMfa]);

  const options: MenuOption[] = [
    {
      label: strings('money.more_sheet.how_it_works'),
      icon: IconName.Book,
      onPress: handleHowItWorks,
      testID: MoneyMoreSheetTestIds.HOW_IT_WORKS_OPTION,
    },
    {
      label: strings('money.more_sheet.what_you_get'),
      icon: IconName.ArrowSquareOut,
      onPress: handleWhatYouGet,
      testID: MoneyMoreSheetTestIds.WHAT_YOU_GET_OPTION,
    },
    {
      label: strings('money.more_sheet.contact_support'),
      icon: IconName.Sms,
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
        {mfaStatus === 'unavailable' ? null : (
          <View style={styles.row} testID={MoneyMoreSheetTestIds.MFA_OPTION}>
            <Icon
              name={IconName.SecurityTick}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
            <View style={styles.rowText}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('money.mfa.more_sheet_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('money.mfa.more_sheet_description')}
              </Text>
            </View>
            <Switch
              isOn={isMfaOn}
              isDisabled={mfaStatus === 'setting_up'}
              onValueChange={handleMfaToggle}
              accessibilityLabel={strings('money.mfa.more_sheet_title')}
              testID={MoneyMoreSheetTestIds.MFA_SWITCH}
            />
          </View>
        )}
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
