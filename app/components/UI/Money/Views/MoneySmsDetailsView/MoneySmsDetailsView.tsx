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
import { maskMoneySmsPhoneNumber } from '../../constants/moneySms';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import MoneyDivider from '../../components/MoneyDivider';
import { useTheme } from '../../../../../util/theme';
import { MoneySmsDetailsViewTestIds } from './MoneySmsDetailsView.testIds';

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

const MoneySmsDetailsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const footerStyle = [
    styles.footer,
    { paddingBottom: Math.max(insets.bottom, 16) },
  ];
  const { isSmsAdded, smsCreatedAt, smsPhoneNumber } =
    useMoneySecurityMethods();

  if (!isSmsAdded) {
    return null;
  }

  const createdOn = (smsCreatedAt ?? new Date()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySmsDetailsViewTestIds.CONTAINER}
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
          testID={MoneySmsDetailsViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.sms_details.title')}
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
              name={IconName.Mobile}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </Box>
          <Box>
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {maskMoneySmsPhoneNumber(smsPhoneNumber)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-0.5"
            >
              {strings('money.sms_details.verified_phone')}
            </Text>
          </Box>
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
          <UsageRow label={strings('money.passkeys.wallet_recovery')} />
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
              screen: Routes.MONEY.MODALS.REMOVE_SMS_SHEET,
            })
          }
          testID={MoneySmsDetailsViewTestIds.REMOVE_BUTTON}
          twClassName="bg-muted"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings('money.sms_details.remove')}
          </Text>
        </Button>
      </Box>
    </Box>
  );
};

export default MoneySmsDetailsView;
