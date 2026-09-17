import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
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
import { strings } from '../../../../../../locales/i18n';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { MoneyAuthenticatorDetailsViewTestIds } from './MoneyAuthenticatorDetailsView.testIds';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  identityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const UsageRow = ({ icon, label }: { icon: IconName; label: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName="py-2"
  >
    <Box style={styles.usageIcon} twClassName="bg-muted">
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconAlternative} />
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {label}
    </Text>
  </Box>
);

const MoneyAuthenticatorDetailsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const footerStyle = [
    styles.footer,
    { paddingBottom: Math.max(insets.bottom, 16) },
  ];
  const {
    authenticatorCreatedAt,
    isAuthenticatorAdded,
    isSocialAdded,
    isSocialLogin,
  } = useMoneySecurityMethods();

  if (!isAuthenticatorAdded) {
    return null;
  }

  const createdOn = (authenticatorCreatedAt ?? new Date()).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyAuthenticatorDetailsViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneyAuthenticatorDetailsViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.authenticator_details.title')}
        </Text>
        <Box style={styles.headerSpacer} />
      </Box>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="rounded-2xl border border-muted p-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            <Box style={styles.identityIcon} twClassName="bg-muted">
              <Icon
                name={IconName.QrCode}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Box>
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.HeadingSm}
                fontWeight={FontWeight.Bold}
              >
                {strings('money.authenticator_details.provider')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mt-0.5"
              >
                {strings('money.passkeys.created_on')} {createdOn}
              </Text>
            </Box>
          </Box>
        </Box>

        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          twClassName="mt-6 mb-2"
        >
          {strings('money.passkeys.used_for')}
        </Text>
        <Box>
          {(isSocialLogin || isSocialAdded) && (
            <UsageRow
              icon={IconName.Lock}
              label={strings('money.passkeys.wallet_recovery')}
            />
          )}
          <UsageRow
            icon={IconName.SecurityTick}
            label={strings('money.passkeys.verifying_transactions')}
          />
        </Box>
      </ScrollView>
      <Box style={footerStyle}>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() =>
            navigation.navigate(Routes.MONEY.MODALS.ROOT, {
              screen: Routes.MONEY.MODALS.REMOVE_AUTHENTICATOR_SHEET,
            })
          }
          testID={MoneyAuthenticatorDetailsViewTestIds.REMOVE_BUTTON}
          twClassName="bg-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings('money.authenticator_details.remove')}
          </Text>
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyAuthenticatorDetailsView;
