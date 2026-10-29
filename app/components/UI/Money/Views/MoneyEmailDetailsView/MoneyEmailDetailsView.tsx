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
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import { formatMoneySecurityMethodDate } from '../../utils/formatMoneySecurityMethodAddedAt';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
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

const MetadataRow = ({ title, value }: { title: string; value: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    gap={4}
    twClassName="py-2"
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      color={TextColor.TextAlternative}
    >
      {title}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Regular}
      twClassName="flex-1 text-right"
    >
      {value}
    </Text>
  </Box>
);

const MoneyEmailDetailsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { emailCreatedAt, isEmailVerified, moneyEmail } = useMoneyFinishSetup();
  const { isSocialLogin } = useMoneySecurityMethods();
  const footerStyle = [
    styles.footer,
    { paddingBottom: Math.max(insets.bottom, 16) },
  ];

  if (!isEmailVerified) {
    return null;
  }

  const createdAt = formatMoneySecurityMethodDate(emailCreatedAt ?? new Date());

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID="money-email-details"
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
          testID="money-email-details-back-button"
        />
        <Box twClassName="flex-1" />
        <Box style={styles.headerSpacer} />
      </Box>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          {moneyEmail}
        </Text>

        <Box twClassName="mt-4">
          <MetadataRow
            title={strings('money.passkey_details.created_date')}
            value={createdAt}
          />
        </Box>

        <Box style={styles.rowDivider} twClassName="mt-4 bg-border-muted" />

        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          twClassName="mt-4 mb-2"
        >
          {strings('money.passkeys.used_for')}
        </Text>
        <Box>
          {isSocialLogin ? (
            <>
              <UsageRow
                icon={IconName.Lock}
                label={strings('money.passkeys.wallet_recovery')}
              />
              <Box style={styles.rowDivider} twClassName="bg-border-muted" />
            </>
          ) : null}
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
              screen: Routes.MONEY.MODALS.REMOVE_EMAIL_SHEET,
            })
          }
          testID="money-email-details-remove-button"
          twClassName="bg-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings('money.email_details.remove')}
          </Text>
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyEmailDetailsView;
