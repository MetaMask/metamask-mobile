import React, { useCallback, useRef } from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import useMountEffect from '../../hooks/useMountEffect';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  MONEY_URLS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { useTheme } from '../../../../../util/theme';

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
  const { colors, brandColors } = useTheme();
  const { isEmailVerified, passkeyCount } = useMoneyFinishSetup();
  const {
    isAuthenticatorAdded,
    isSmsAdded,
    isTransactionVerificationEnabled,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);

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

  const handleTransactionVerificationChange = useCallback(
    (enabled: boolean) => {
      if (!enabled && isTransactionVerificationEnabled) {
        closeAndNavigate(() => {
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
            params: {
              variant: 'disable-transaction-verification',
              returnToMoneyHome: true,
            },
          });
        });
        return;
      }

      if (enabled && !isTransactionVerificationEnabled) {
        const hasVerificationMethod =
          passkeyCount > 0 ||
          isEmailVerified ||
          isAuthenticatorAdded ||
          isSmsAdded;
        closeAndNavigate(() => {
          if (hasVerificationMethod) {
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
              params: {
                action: { type: 'enable-transaction-verification' },
              },
            });
          } else {
            navigation.navigate(Routes.MONEY.SECURITY_SETUP);
          }
        });
        return;
      }

      setTransactionVerificationEnabled(enabled);
    },
    [
      closeAndNavigate,
      isAuthenticatorAdded,
      isEmailVerified,
      isSmsAdded,
      isTransactionVerificationEnabled,
      navigation,
      passkeyCount,
      setTransactionVerificationEnabled,
    ],
  );

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
        <Box
          style={styles.securityRow}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          testID={MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_OPTION}
        >
          <Box style={styles.iconContainer}>
            <Icon
              name={IconName.SecurityTick}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </Box>
          <Box style={styles.securityCopy}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('money.more_sheet.manage_security')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.securityDescription}
            >
              {strings('money.more_sheet.verification_description')}
            </Text>
          </Box>
          <Switch
            value={isTransactionVerificationEnabled}
            onValueChange={handleTransactionVerificationChange}
            trackColor={{
              false: colors.border.muted,
              true: colors.primary.default,
            }}
            thumbColor={brandColors.white}
            ios_backgroundColor={colors.border.muted}
            testID={MoneyMoreSheetTestIds.TWO_STEP_VERIFICATION_SWITCH}
          />
        </Box>
        {options.map((item) => (
          <TouchableOpacity
            key={item.testID}
            onPress={item.onPress}
            style={styles.row}
            testID={item.testID}
          >
            <Box style={styles.iconContainer}>
              <Icon
                name={item.icon}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
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
