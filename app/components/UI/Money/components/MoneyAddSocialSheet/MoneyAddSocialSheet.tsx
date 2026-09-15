import React, { useCallback, useContext, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import SocialLoginProviderButtons from '../../../SocialLoginProviderButtons';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import type { MoneySocialProvider } from '../../constants/moneySocial';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { MoneyAddSocialSheetTestIds } from './MoneyAddSocialSheet.testIds';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  description: {
    alignSelf: 'stretch',
    textAlign: 'left',
  },
});

const SOCIAL_SUCCESS_TOAST_KEYS: Record<MoneySocialProvider, string> = {
  google: 'money.social.google_success_toast',
  apple: 'money.social.apple_success_toast',
  telegram: 'money.social.telegram_success_toast',
};

const MoneyAddSocialSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyAddSocialSheet'>>();
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { markTaskComplete } = useMoneyFinishSetup();
  const { addSocial } = useMoneySecurityMethods();

  const handleProviderPress = useCallback(
    (provider: MoneySocialProvider) => {
      addSocial(provider);
      markTaskComplete('recovery_method');
      sheetRef.current?.onCloseBottomSheet(() => {
        if (route.params?.returnToMoneyHome) {
          navigation.navigate(Routes.HOME_TABS, {
            screen: Routes.MONEY.ROOT,
            params: { screen: Routes.MONEY.HOME },
          });
        }
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: ToastIconName.Check,
          iconColor: colors.success.default,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: strings(SOCIAL_SUCCESS_TOAST_KEYS[provider]),
              isBold: true,
            },
          ],
        });
      });
    },
    [
      addSocial,
      colors.success.default,
      markTaskComplete,
      navigation,
      route.params?.returnToMoneyHome,
      toastRef,
    ],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={() => navigation.goBack()}
      keyboardAvoidingViewEnabled={false}
      testID={MoneyAddSocialSheetTestIds.CONTAINER}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('money.social.add_title')}
      </BottomSheetHeader>
      <Box style={styles.content}>
        <Box twClassName="pb-6">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.description}
          >
            {strings('money.social.add_description')}
          </Text>
        </Box>
        <Box twClassName="gap-3">
          <SocialLoginProviderButtons
            googleLabel={strings('money.social.continue_google')}
            appleLabel={strings('money.social.continue_apple')}
            telegramLabel={strings('money.social.continue_telegram')}
            onPressGoogle={() => handleProviderPress('google')}
            onPressApple={() => handleProviderPress('apple')}
            onPressTelegram={() => handleProviderPress('telegram')}
            googleTestID={MoneyAddSocialSheetTestIds.GOOGLE_BUTTON}
            appleTestID={MoneyAddSocialSheetTestIds.APPLE_BUTTON}
            telegramTestID={MoneyAddSocialSheetTestIds.TELEGRAM_BUTTON}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default MoneyAddSocialSheet;
