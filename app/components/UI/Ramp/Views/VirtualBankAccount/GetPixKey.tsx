import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  MOONPAY_PRIVACY_POLICY_URL,
  MOONPAY_TERMS_URL,
  TRACE_TERMS_URL,
} from './constants';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import { startIronKycFlow } from './ironKycFlow';

// Placeholder until the real vault/config APY feed is wired into this screen.
const PIX_APY_PERCENTAGE = 4;

const BenefitRow = ({
  icon,
  children,
}: {
  icon: IconName;
  children: React.ReactNode;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="gap-3"
  >
    <Box twClassName="shrink-0 pt-0.5">
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconAlternative} />
    </Box>
    <Box twClassName="flex-1">{children}</Box>
  </Box>
);

const LegalLink = ({
  onPress,
  testID,
  children,
}: {
  onPress: () => void;
  testID: string;
  children: string;
}) => (
  <Text
    variant={TextVariant.BodyMd}
    color={TextColor.PrimaryDefault}
    twClassName="underline"
    onPress={onPress}
    testID={testID}
  >
    {children}
  </Text>
);

const GetPixKey = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isStartingKyc, setIsStartingKyc] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAgreeAndContinue = useCallback(async () => {
    setIsStartingKyc(true);
    try {
      await startIronKycFlow();
      navigation.navigate(Routes.RAMP.VBA_VERIFY_IDENTITY);
    } catch (error) {
      Alert.alert(
        strings('virtual_bank_account.kyc_error.title'),
        error instanceof Error
          ? error.message
          : strings('virtual_bank_account.kyc_error.start_failed'),
      );
    } finally {
      setIsStartingKyc(false);
    }
  }, [navigation]);

  const openMoonPayPrivacyPolicy = useCallback(
    () => Linking.openURL(MOONPAY_PRIVACY_POLICY_URL),
    [],
  );
  const openMoonPayTerms = useCallback(
    () => Linking.openURL(MOONPAY_TERMS_URL),
    [],
  );
  const openTraceTerms = useCallback(
    () => Linking.openURL(TRACE_TERMS_URL),
    [],
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title={strings('virtual_bank_account.get_pix_key.navbar_title')}
        onBack={handleBack}
        backButtonProps={{ testID: GetPixKeySelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={GetPixKeySelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {strings('virtual_bank_account.get_pix_key.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.get_pix_key.description')}
        </Text>

        <Box twClassName="mt-4 p-4 gap-4 rounded-xl bg-muted">
          <BenefitRow icon={IconName.AttachMoney}>
            <Text variant={TextVariant.BodyMd}>
              {strings('virtual_bank_account.get_pix_key.benefit_apy', {
                percentage: PIX_APY_PERCENTAGE,
              })}
            </Text>
          </BenefitRow>
          <BenefitRow icon={IconName.Receive}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Text variant={TextVariant.BodyMd}>
                {strings(
                  'virtual_bank_account.get_pix_key.benefit_deposit_pix',
                )}
              </Text>
              <Tag severity={TagSeverity.Info}>Pix</Tag>
            </Box>
          </BenefitRow>
          <BenefitRow icon={IconName.Bank}>
            <Text variant={TextVariant.BodyMd}>
              {strings(
                'virtual_bank_account.get_pix_key.benefit_multi_currency',
              )}
            </Text>
          </BenefitRow>
          <BenefitRow icon={IconName.Global}>
            <Text variant={TextVariant.BodyMd}>
              {strings('virtual_bank_account.get_pix_key.benefit_payments')}
            </Text>
          </BenefitRow>
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-6"
        >
          {strings(
            'virtual_bank_account.get_pix_key.agreements_disclosures_title',
          )}
        </Text>
        <Box twClassName="mt-2 gap-2">
          <LegalLink
            onPress={openMoonPayPrivacyPolicy}
            testID={GetPixKeySelectorsIDs.MOONPAY_PRIVACY_POLICY_LINK}
          >
            {strings('virtual_bank_account.get_pix_key.moonpay_privacy_policy')}
          </LegalLink>
          <LegalLink
            onPress={openMoonPayTerms}
            testID={GetPixKeySelectorsIDs.MOONPAY_TERMS_LINK}
          >
            {strings('virtual_bank_account.get_pix_key.moonpay_terms')}
          </LegalLink>
          <LegalLink
            onPress={openTraceTerms}
            testID={GetPixKeySelectorsIDs.TRACE_TERMS_LINK}
          >
            {strings('virtual_bank_account.get_pix_key.trace_terms')}
          </LegalLink>
        </Box>
      </ScrollView>

      <Box twClassName="p-4 gap-3">
        <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
          {strings('virtual_bank_account.get_pix_key.agreement_text')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isStartingKyc}
          isDisabled={isStartingKyc}
          onPress={handleAgreeAndContinue}
          testID={GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.get_pix_key.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default GetPixKey;
