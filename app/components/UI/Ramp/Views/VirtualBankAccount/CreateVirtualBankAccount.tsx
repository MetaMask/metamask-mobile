import React, { useCallback, useState } from 'react';
import { Image, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { isPositiveNumberOrZero } from '../../../Money/utils/number';
import vbaIntroHero from '../../../../../images/vba-intro-hero.png';
import MoonPayPoweredByLogo from '../../../../../images/moonpay-powered-by-logo.svg';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';

const FeatureRow = ({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="min-h-14 gap-3 px-4 py-3"
  >
    <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {title}
      </Text>
      <Text variant={TextVariant.BodySm} twClassName="opacity-72">
        {description}
      </Text>
    </Box>
  </Box>
);

interface CreateVirtualBankAccountProps {
  onSuccess: () => void | Promise<void>;
}

const CreateVirtualBankAccount = ({
  onSuccess,
}: CreateVirtualBankAccountProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  } = useKycDisclaimers();
  const { apyPercent } = useMoneyVaultApy();

  // The user can't agree to disclaimers they haven't been shown.
  const canAgreeAndContinue =
    !isLoading &&
    !isAccepting &&
    !isAdvancing &&
    !error &&
    Boolean(disclaimers?.length);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAgreeAndContinue = useCallback(async () => {
    if (isAdvancing) {
      return;
    }

    setIsAdvancing(true);
    try {
      // Persist vendor terms locally. Email creates the vendor session and
      // records these accepted ids before continuing.
      if (await acceptDisclaimers()) {
        await onSuccess();
      }
    } finally {
      setIsAdvancing(false);
    }
  }, [acceptDisclaimers, isAdvancing, onSuccess]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow pb-6')}
        testID={CreateVirtualBankAccountSelectorsIDs.CONTAINER}
      >
        <Image
          source={vbaIntroHero}
          style={tw.style('h-22 w-full')}
          resizeMode="contain"
        />
        <Box twClassName="gap-2 p-4">
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
          >
            {strings('virtual_bank_account.create_virtual_bank_account.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.description',
            )}
          </Text>
        </Box>

        <Box twClassName="px-4 py-2.5">
          <Box twClassName="rounded-3xl bg-muted">
            <FeatureRow
              icon={IconName.MoneyBag}
              title={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_no_fees_title',
              )}
              description={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_no_fees_description',
              )}
            />
            <FeatureRow
              icon={IconName.Clock}
              title={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
              )}
              description={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_arrives_description',
              )}
            />
            <FeatureRow
              icon={IconName.Refresh}
              title={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_set_up_title',
              )}
              description={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_set_up_description',
              )}
            />
            <FeatureRow
              icon={IconName.TrendUp}
              title={strings(
                'virtual_bank_account.create_virtual_bank_account.feature_earn_title',
              )}
              description={
                isPositiveNumberOrZero(apyPercent)
                  ? strings(
                      'virtual_bank_account.create_virtual_bank_account.feature_earn_description',
                      { percentage: apyPercent },
                    )
                  : strings(
                      'virtual_bank_account.create_virtual_bank_account.feature_earn_description_no_apy',
                    )
              }
            />
          </Box>
        </Box>
      </ScrollView>

      <Box twClassName="gap-4 px-4 pt-4 pb-2">
        {error ? (
          <Box
            alignItems={BoxAlignItems.Center}
            testID={CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_ERROR}
          >
            <Text variant={TextVariant.BodyXs} color={TextColor.ErrorDefault}>
              {strings(
                'virtual_bank_account.create_virtual_bank_account.disclaimers_error',
              )}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.PrimaryDefault}
              onPress={retry}
              testID={CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_RETRY}
            >
              {strings(
                'virtual_bank_account.create_virtual_bank_account.disclaimers_retry',
              )}
            </Text>
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={
              isLoading
                ? CreateVirtualBankAccountSelectorsIDs.DISCLAIMERS_LOADING
                : undefined
            }
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.agreement_prefix',
            )}
            {disclaimers?.map((disclaimer, index) => (
              <React.Fragment key={disclaimer.id}>
                {index > 0
                  ? strings(
                      'virtual_bank_account.create_virtual_bank_account.agreement_separator',
                    )
                  : ''}
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.PrimaryDefault}
                  onPress={() => Linking.openURL(disclaimer.url)}
                  testID={`${CreateVirtualBankAccountSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
                >
                  {disclaimer.display_name}
                </Text>
              </React.Fragment>
            ))}
            {disclaimers?.length
              ? strings(
                  'virtual_bank_account.create_virtual_bank_account.agreement_suffix',
                )
              : null}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting || isAdvancing}
          isDisabled={!canAgreeAndContinue}
          onPress={handleAgreeAndContinue}
          testID={
            CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON
          }
        >
          {strings('virtual_bank_account.create_virtual_bank_account.button')}
        </Button>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="h-10 justify-center gap-1 opacity-40"
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.powered_by',
            )}
          </Text>
          <MoonPayPoweredByLogo name="moonpay-powered-by-logo" />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default CreateVirtualBankAccount;
