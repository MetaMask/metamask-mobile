import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { SocialLoginProviderIcon } from '../../../SocialLoginProviderButtons';
import { MONEY_SOCIAL_PROVIDER_LABEL_KEYS } from '../../constants/moneySocial';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';
import MoneyDivider from '../../components/MoneyDivider';
import { useTheme } from '../../../../../util/theme';
import { MoneySocialDetailsViewTestIds } from './MoneySocialDetailsView.testIds';

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

const MoneySocialDetailsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSocialAdded, socialAccount, socialCreatedAt, socialProvider } =
    useMoneySecurityMethods();

  if (!isSocialAdded) {
    return null;
  }

  const createdOn = (socialCreatedAt ?? new Date()).toLocaleDateString(
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
      testID={MoneySocialDetailsViewTestIds.CONTAINER}
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
          testID={MoneySocialDetailsViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.social.details_title')}
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
          twClassName="pb-5"
        >
          <Box style={styles.identityIcon} twClassName="bg-muted">
            <SocialLoginProviderIcon
              provider={socialProvider}
              testID={MoneySocialDetailsViewTestIds.PROVIDER_ICON}
            />
          </Box>
          <Box twClassName="flex-1">
            <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
              {strings(MONEY_SOCIAL_PROVIDER_LABEL_KEYS[socialProvider])}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-0.5"
            >
              {socialAccount}
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
        </Box>
      </ScrollView>
    </Box>
  );
};

export default MoneySocialDetailsView;
