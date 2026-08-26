import React, { useCallback } from 'react';
import { Linking, ScrollView } from 'react-native';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { brandColor } from '@metamask/design-tokens';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import TagBase from '../../../../../component-library/base-components/TagBase';
import { TagShape } from '../../../../../component-library/base-components/TagBase/TagBase.types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { PIX_BRAND_COLOR, VBA_KYC_COUNTRY_CODE } from './constants';
import { GetPixKeySelectorsIDs } from './GetPixKey.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';
import LegalLink from './components/LegalLink';

// Pix's badge is bold italic white on brand teal regardless of app theme.
const PIX_TAG_TEXT_STYLE = {
  color: brandColor.white,
  fontStyle: 'italic' as const,
  fontWeight: 'bold' as const,
};

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
      <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
    </Box>
    <Box twClassName="flex-1">{children}</Box>
  </Box>
);

const GetPixKey = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } =
    useKycDisclaimers(VBA_KYC_COUNTRY_CODE);

  // The user can't agree to disclaimers they haven't been shown.
  const canAgreeAndContinue = !isLoading && !error && disclaimers.length > 0;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAgreeAndContinue = useCallback(() => {
    navigation.navigate(Routes.RAMP.VBA_VERIFY_IDENTITY);
  }, [navigation]);

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

        <Box twClassName="mt-4 p-5 gap-5 rounded-xl bg-muted">
          <BenefitRow icon={IconName.Share}>
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
              <TagBase
                shape={TagShape.Rectangle}
                style={{ backgroundColor: PIX_BRAND_COLOR }}
                textProps={{ style: PIX_TAG_TEXT_STYLE }}
              >
                pix
              </TagBase>
            </Box>
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
          {isLoading ? (
            <Box
              testID={GetPixKeySelectorsIDs.DISCLAIMERS_LOADING}
              twClassName="gap-2 py-1"
            >
              <Skeleton height={16} width="70%" />
              <Skeleton height={16} width="55%" />
            </Box>
          ) : error ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              twClassName="gap-2 py-1"
              testID={GetPixKeySelectorsIDs.DISCLAIMERS_ERROR}
            >
              <Box twClassName="shrink-0 pt-0.5">
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.ErrorDefault}
                />
              </Box>
              <Box twClassName="flex-1 gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                >
                  {strings(
                    'virtual_bank_account.get_pix_key.disclaimers_error',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.PrimaryDefault}
                  twClassName="underline"
                  onPress={retry}
                  testID={GetPixKeySelectorsIDs.DISCLAIMERS_RETRY}
                >
                  {strings(
                    'virtual_bank_account.get_pix_key.disclaimers_retry',
                  )}
                </Text>
              </Box>
            </Box>
          ) : (
            disclaimers.map((disclaimer) => (
              <LegalLink
                key={disclaimer.id}
                onPress={() => Linking.openURL(disclaimer.url)}
                testID={`${GetPixKeySelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
              >
                {disclaimer.display_name}
              </LegalLink>
            ))
          )}
        </Box>
      </ScrollView>

      <Box twClassName="p-4 gap-3">
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextMuted}
          twClassName="text-center"
        >
          {strings('virtual_bank_account.get_pix_key.agreement_text')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!canAgreeAndContinue}
          onPress={handleAgreeAndContinue}
          testID={GetPixKeySelectorsIDs.AGREE_AND_CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.get_pix_key.button')}
        </Button>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextMuted}
          twClassName="text-center"
        >
          {strings('virtual_bank_account.get_pix_key.powered_by_moonpay')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default GetPixKey;
