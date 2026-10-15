import React, { useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
import type { MoneyNavigationParamList } from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { MoneyPasskeysViewTestIds } from './MoneyPasskeysView.testIds';
import MoneySecuritySetupImage from '../../../../../images/money-security-setup.png';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  emptyContent: {
    alignItems: 'center',
    paddingTop: 12,
  },
  heroImage: {
    width: 92,
    height: 92,
    marginBottom: 24,
  },
  centeredText: {
    textAlign: 'center',
  },
  benefitsCard: {
    alignSelf: 'stretch',
    marginTop: 32,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  benefitIcon: { width: 24, alignItems: 'flex-start' },
  credentialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  credentialRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: { height: StyleSheet.hairlineWidth },
});

interface PasskeyBenefitProps {
  icon: IconName;
  title: string;
}

const PasskeyBenefit = ({ icon, title }: PasskeyBenefitProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    gap={3}
    twClassName="py-3"
  >
    <Box style={styles.benefitIcon} twClassName="pt-0.5">
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      twClassName="flex-1"
    >
      {title}
    </Text>
  </Box>
);

const MoneyPasskeysView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyPasskeys'>>();
  const insets = useSafeAreaInsets();
  const { isTaskComplete, passkeys } = useMoneyFinishSetup();
  const hasPasskey = isTaskComplete('secure_money');

  const handlePrimaryPress = useCallback(() => {
    const isFinishSetup = route.params?.entryPoint === 'finish_setup';
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: {
        returnToMoneyHome: isFinishSetup,
        ...(isFinishSetup
          ? { showAdditionalFactorPrompt: true }
          : { returnToSecurity: true }),
      },
    });
  }, [navigation, route.params?.entryPoint]);

  const handlePasskeyPress = useCallback(
    (passkeyIndex: number) => {
      navigation.navigate(Routes.MONEY.PASSKEY_DETAILS, { passkeyIndex });
    },
    [navigation],
  );

  const handleAddAuthenticatorPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'finish_setup',
    });
  }, [navigation]);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyPasskeysViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneyPasskeysViewTestIds.BACK_BUTTON}
        />
        {hasPasskey ? (
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('money.passkeys.title')}
          </Text>
        ) : (
          <Box style={styles.headerSpacer} />
        )}
        <Box style={styles.headerSpacer} />
      </Box>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {hasPasskey ? (
          <>
            {passkeys.map((passkey, index) => (
              <React.Fragment key={index}>
                <Pressable
                  style={styles.credentialRow}
                  onPress={() => handlePasskeyPress(index)}
                  accessibilityRole="button"
                  testID={`${MoneyPasskeysViewTestIds.PASSKEY_ROW}-${index + 1}`}
                >
                  <Box style={styles.credentialIcon} twClassName="bg-muted">
                    <Icon
                      name={IconName.Key}
                      size={IconSize.Md}
                      color={IconColor.IconDefault}
                    />
                  </Box>
                  <Box twClassName="flex-1">
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      testID={`${MoneyPasskeysViewTestIds.PASSKEY_NAME}-${index + 1}`}
                    >
                      {passkey.name}
                    </Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      twClassName="mt-0.5"
                    >
                      {strings('money.passkeys.last_used_today')}
                    </Text>
                  </Box>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Pressable>
              </React.Fragment>
            ))}
          </>
        ) : (
          <Box style={styles.emptyContent}>
            <Image
              source={MoneySecuritySetupImage}
              style={styles.heroImage}
              resizeMode="contain"
            />
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              style={styles.centeredText}
            >
              {strings('money.passkeys.empty_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.centeredText}
              twClassName="mt-2"
            >
              {strings('money.passkeys.empty_description')}
            </Text>
            <Box style={styles.benefitsCard} twClassName="bg-muted">
              <PasskeyBenefit
                icon={IconName.FaceId}
                title={strings('money.passkeys.biometrics_title')}
              />
              <PasskeyBenefit
                icon={IconName.Mobile}
                title={strings('money.passkeys.sync_title')}
              />
              <PasskeyBenefit
                icon={IconName.SecurityTick}
                title={strings('money.passkeys.verify_title')}
              />
            </Box>
          </Box>
        )}
      </ScrollView>

      <Box
        twClassName="px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handlePrimaryPress}
          testID={MoneyPasskeysViewTestIds.ADD_BUTTON}
        >
          {strings('money.passkeys.add_button')}
        </Button>
        {route.params?.entryPoint === 'finish_setup' && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleAddAuthenticatorPress}
            testID={MoneyPasskeysViewTestIds.ADD_AUTHENTICATOR_BUTTON}
            twClassName="mt-3"
          >
            {strings('money.passkeys.add_authenticator_instead')}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default MoneyPasskeysView;
