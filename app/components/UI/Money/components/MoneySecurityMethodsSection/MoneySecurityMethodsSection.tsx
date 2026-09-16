import React from 'react';
import { Pressable, StyleSheet, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
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
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import {
  MONEY_DEFAULT_VERIFICATION_METHOD_LABEL_KEYS,
  useMoneySecurityMethods,
} from '../../hooks/useMoneySecurityMethods';
import { MONEY_SOCIAL_PROVIDER_LABEL_KEYS } from '../../constants/moneySocial';
import { MoneySecurityViewTestIds } from '../../Views/MoneySecurityView/MoneySecurityView.testIds';

const styles = StyleSheet.create({
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  methodIcon: {
    width: 24,
    alignItems: 'center',
  },
  switch: {
    alignSelf: 'flex-start',
  },
});

interface SecurityMethodRowProps {
  title: string;
  icon: IconName;
  testID: string;
  recommended?: boolean;
  isAdded?: boolean;
  addedLabel?: string;
  onPress?: () => void;
  showInlineCheckWhenAdded?: boolean;
  showChevron?: boolean;
}

const SecurityMethodRow = ({
  title,
  icon,
  testID,
  recommended = false,
  isAdded,
  addedLabel,
  onPress,
  showInlineCheckWhenAdded = false,
  showChevron = false,
}: SecurityMethodRowProps) => {
  const resolvedIsAdded = isAdded ?? false;
  const showInlineCheck =
    resolvedIsAdded && (!addedLabel || showInlineCheckWhenAdded);

  return (
    <Pressable
      style={styles.methodRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: resolvedIsAdded }}
      testID={testID}
    >
      <Box style={styles.methodIcon}>
        <Icon
          name={icon}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Box>
      <Box twClassName="flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {title}
          </Text>
          {recommended && (
            <Box twClassName="rounded bg-primary-muted px-1.5 py-0.5">
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.PrimaryDefault}
              >
                {strings('money.security.recommended')}
              </Text>
            </Box>
          )}
          {showInlineCheck && (
            <Icon
              name={IconName.Check}
              size={IconSize.Md}
              color={IconColor.SuccessDefault}
              testID={`${testID}-added-check`}
            />
          )}
        </Box>
      </Box>
      {(addedLabel || !resolvedIsAdded) && (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {resolvedIsAdded ? addedLabel : strings('money.security.method_add')}
        </Text>
      )}
      {(onPress || showChevron) && (
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          testID={`${testID}-chevron`}
        />
      )}
    </Pressable>
  );
};

interface MoneySecurityMethodsSectionProps {
  title?: string;
  compactBottomSpacing?: boolean;
  showTransactionVerification?: boolean;
}

const MoneySecurityMethodsSection = ({
  title = strings('money.security.methods_title'),
  compactBottomSpacing = false,
  showTransactionVerification = true,
}: MoneySecurityMethodsSectionProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { brandColors, colors } = useTheme();
  const { passkeyCount } = useMoneyFinishSetup();
  const {
    defaultVerificationMethod: defaultVerificationMethodType,
    isAuthenticatorAdded,
    isSocialAdded,
    isSocialLogin,
    isSmsAdded,
    isTransactionVerificationEnabled,
    setTransactionVerificationEnabled,
    socialProvider,
  } = useMoneySecurityMethods(passkeyCount);
  const defaultVerificationMethodLabel = strings(
    MONEY_DEFAULT_VERIFICATION_METHOD_LABEL_KEYS[defaultVerificationMethodType],
  );

  const handleTransactionVerificationChange = (enabled: boolean) => {
    if (!enabled && isTransactionVerificationEnabled) {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.SECURITY_INFO_SHEET,
        params: { variant: 'disable-transaction-verification' },
      });
      return;
    }

    setTransactionVerificationEnabled(enabled);
    const hasExistingSecurityMethod =
      passkeyCount > 0 || isAuthenticatorAdded || isSmsAdded;
    if (enabled && !hasExistingSecurityMethod) {
      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
        params: { returnToMoneyHome: false },
      });
    }
  };

  return (
    <>
      <Box twClassName="pt-5 pb-3">
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-1"
        >
          {strings('money.security.hero_description')}
        </Text>
      </Box>

      <Box>
        <SecurityMethodRow
          title={strings('money.security.passkeys')}
          icon={IconName.Key}
          recommended={passkeyCount === 0}
          isAdded={passkeyCount > 0}
          showInlineCheckWhenAdded
          addedLabel={
            passkeyCount > 0
              ? strings(
                  passkeyCount === 1
                    ? 'money.security.passkey_count'
                    : 'money.security.passkey_count_plural',
                  { count: passkeyCount },
                )
              : undefined
          }
          onPress={() =>
            navigation.navigate(Routes.MONEY.PASSKEYS, {
              entryPoint: 'security',
            })
          }
          testID={MoneySecurityViewTestIds.PASSKEYS_ROW}
        />
        {isSocialLogin ? (
          <SecurityMethodRow
            title={strings('money.security.sms')}
            icon={IconName.Mobile}
            isAdded={isSmsAdded}
            showInlineCheckWhenAdded
            showChevron
            onPress={() =>
              navigation.navigate(
                isSmsAdded ? Routes.MONEY.SMS_DETAILS : Routes.MONEY.SMS_SETUP,
              )
            }
            testID={MoneySecurityViewTestIds.SMS_ROW}
          />
        ) : (
          <SecurityMethodRow
            title={strings('money.security.social')}
            icon={IconName.Connect}
            isAdded={isSocialAdded}
            showInlineCheckWhenAdded
            addedLabel={
              isSocialAdded
                ? strings(MONEY_SOCIAL_PROVIDER_LABEL_KEYS[socialProvider])
                : undefined
            }
            onPress={() =>
              isSocialAdded
                ? navigation.navigate(Routes.MONEY.SOCIAL_DETAILS)
                : navigation.navigate(Routes.MONEY.MODALS.ROOT, {
                    screen: Routes.MONEY.MODALS.ADD_SOCIAL_SHEET,
                  })
            }
            testID={MoneySecurityViewTestIds.SECONDARY_METHOD_ROW}
          />
        )}
        <SecurityMethodRow
          title={strings('money.security.authenticator')}
          icon={IconName.QrCode}
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
      </Box>

      {showTransactionVerification && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          gap={3}
          twClassName={compactBottomSpacing ? 'pt-5 pb-0' : 'py-5'}
        >
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('money.security.transaction_verification')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-1"
            >
              {strings(
                isTransactionVerificationEnabled
                  ? 'money.security.transaction_verification_description_enabled'
                  : 'money.security.transaction_verification_description',
                isTransactionVerificationEnabled
                  ? { method: defaultVerificationMethodLabel }
                  : undefined,
              )}
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
      )}
    </>
  );
};

export default MoneySecurityMethodsSection;
