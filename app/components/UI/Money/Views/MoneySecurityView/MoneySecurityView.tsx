import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneySecurityToast } from '../../hooks/useMoneySecurityToast';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { MoneySecurityViewTestIds } from './MoneySecurityView.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { height: 52, paddingHorizontal: 4 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { marginTop: 8, marginBottom: 14 },
  toggleRow: { paddingVertical: 8, marginBottom: 4 },
  toggleCopy: { flex: 1, paddingRight: 16 },
  description: { marginTop: 6, lineHeight: 24 },
  methodRow: { minHeight: 58, paddingVertical: 8 },
  methodTitle: { flex: 1 },
  methodAccessory: { gap: 12 },
  switch: { alignSelf: 'flex-start' },
});

interface MethodRowProps {
  title: string;
  isAdded: boolean;
  testID: string;
  onPress: () => void;
}

const MethodRow = ({ title, isAdded, testID, onPress }: MethodRowProps) => (
  <Pressable onPress={onPress} accessibilityRole="button" testID={testID}>
    <Box
      style={styles.methodRow}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.methodTitle}
      >
        {title}
      </Text>
      <Box
        style={styles.methodAccessory}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {!isAdded ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('money.security.method_add')}
          </Text>
        ) : null}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          testID={`${testID}-chevron`}
        />
      </Box>
    </Box>
  </Pressable>
);

const MoneySecurityView = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<MoneyNavigationParamList, 'MoneyManageSecurity'>
    >();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyManageSecurity'>>();
  const insets = useSafeAreaInsets();
  const showSuccessToast = useMoneySecurityToast();
  const { brandColors, colors } = useTheme();
  const { isEmailVerified, passkeyCount } = useMoneyFinishSetup();
  const {
    isAuthenticatorAdded,
    isSmsAdded,
    isTransactionVerificationEnabled,
    setTransactionVerificationEnabled,
  } = useMoneySecurityMethods(passkeyCount);

  useFocusEffect(
    useCallback(() => {
      const successToast = route.params?.successToast;
      if (!successToast) {
        return;
      }

      showSuccessToast(successToast);
      navigation.setParams({ successToast: undefined });
    }, [navigation, route.params?.successToast, showSuccessToast]),
  );

  const handleTransactionVerificationChange = (enabled: boolean) => {
    if (!enabled && isTransactionVerificationEnabled) {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
        params: {
          variant: 'disable-transaction-verification',
          returnToPrevious: true,
        },
      });
      return;
    }

    if (enabled && !isTransactionVerificationEnabled) {
      const hasVerificationMethod =
        passkeyCount > 0 ||
        isEmailVerified ||
        isAuthenticatorAdded ||
        isSmsAdded;

      if (hasVerificationMethod) {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
          params: {
            action: {
              type: 'enable-transaction-verification',
              returnToPrevious: true,
            },
          },
        });
      } else {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
          params: { returnToMoneyHome: false },
        });
      }
      return;
    }

    setTransactionVerificationEnabled(enabled);
  };

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySecurityViewTestIds.CONTAINER}
    >
      <Box
        style={styles.header}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneySecurityViewTestIds.BACK_BUTTON}
        />
      </Box>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          style={styles.title}
        >
          {strings('money.security.title')}
        </Text>
        <Box
          style={styles.toggleRow}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
        >
          <Box style={styles.toggleCopy}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('money.security.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.description}
            >
              {strings('money.security.settings_description')}
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
            style={styles.switch}
            testID={MoneySecurityViewTestIds.TRANSACTION_VERIFICATION_SWITCH}
          />
        </Box>
        <MethodRow
          title={strings('money.security.passkeys')}
          isAdded={passkeyCount > 0}
          onPress={() =>
            navigation.navigate(Routes.MONEY.PASSKEYS, {
              entryPoint: 'security',
            })
          }
          testID={MoneySecurityViewTestIds.PASSKEYS_ROW}
        />
        <MethodRow
          title={strings('money.security.email')}
          isAdded={isEmailVerified}
          onPress={() =>
            isEmailVerified
              ? navigation.navigate(Routes.MONEY.EMAIL_DETAILS)
              : navigation.navigate(Routes.MONEY.EMAIL_VERIFICATION, {
                  returnToSecurity: true,
                })
          }
          testID="money-security-email-row"
        />
        <MethodRow
          title={strings('money.security.authenticator')}
          isAdded={isAuthenticatorAdded}
          onPress={() =>
            isAuthenticatorAdded
              ? navigation.navigate(Routes.MONEY.AUTHENTICATOR_DETAILS)
              : navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
                  entryPoint: 'security',
                })
          }
          testID={MoneySecurityViewTestIds.AUTHENTICATOR_ROW}
        />
        <MethodRow
          title={strings('money.security.sms')}
          isAdded={isSmsAdded}
          onPress={() =>
            navigation.navigate(
              isSmsAdded ? Routes.MONEY.SMS_DETAILS : Routes.MONEY.SMS_SETUP,
            )
          }
          testID={MoneySecurityViewTestIds.SMS_ROW}
        />
      </ScrollView>
    </Box>
  );
};

export default MoneySecurityView;
