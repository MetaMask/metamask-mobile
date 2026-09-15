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
import MoneyDivider from '../../components/MoneyDivider';
import { useTheme } from '../../../../../util/theme';
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
  usedForDivider: {
    height: 1,
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
});

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    gap={4}
    twClassName="py-2"
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const UsageRow = ({ label }: { label: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName="py-2"
  >
    <Icon
      name={IconName.Check}
      size={IconSize.Md}
      color={IconColor.SuccessDefault}
    />
    <Text variant={TextVariant.BodyMd}>{label}</Text>
  </Box>
);

const MoneyAuthenticatorDetailsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
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
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          twClassName="pb-4"
        >
          <Box style={styles.identityIcon} twClassName="bg-muted">
            <Icon
              name={IconName.QrCode}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </Box>
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('money.authenticator_details.provider')}
          </Text>
        </Box>

        <MetadataRow
          label={strings('money.passkeys.created_on')}
          value={createdOn}
        />
        <MetadataRow
          label={strings('money.passkeys.last_used')}
          value={strings('money.passkeys.today')}
        />

        <MoneyDivider
          color={colors.border.muted}
          style={styles.usedForDivider}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.passkeys.used_for')}
        </Text>
        <Box twClassName="mt-2">
          {(isSocialLogin || isSocialAdded) && (
            <UsageRow label={strings('money.passkeys.wallet_recovery')} />
          )}
          <UsageRow label={strings('money.passkeys.verifying_transactions')} />
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
