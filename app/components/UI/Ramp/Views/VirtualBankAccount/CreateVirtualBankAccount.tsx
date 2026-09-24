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
import Routes from '../../../../../constants/navigation/Routes';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useKycDisclaimers } from './hooks/useKycDisclaimers';

const BenefitRow = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="gap-3"
  >
    <Icon
      name={IconName.Gift}
      size={IconSize.Md}
      color={IconColor.IconDefault}
      twClassName="mt-1 shrink-0"
    />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyLg}>{title}</Text>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {description}
      </Text>
    </Box>
  </Box>
);

const CreateVirtualBankAccount = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const {
    disclaimers,
    isLoading,
    isAccepting,
    error,
    acceptDisclaimers,
    retry,
  } = useKycDisclaimers();

  // The user can't agree to disclaimers they haven't been shown.
  const canAgreeAndContinue =
    !isLoading && !isAccepting && !error && Boolean(disclaimers?.length);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleAgreeAndContinue = useCallback(async () => {
    // Persist Terms 1 locally. Email creates the vendor session and flushes
    // these accepted ids to the account before routing to Terms 2.
    if (await acceptDisclaimers()) {
      navigation.navigate(Routes.RAMP.VBA_KYC_EMAIL);
    }
  }, [acceptDisclaimers, navigation]);

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
        contentContainerStyle={tw.style('flex-grow px-4 pb-6')}
        testID={CreateVirtualBankAccountSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="mt-2">
          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="h-24 w-24 justify-center rounded-full bg-muted"
          >
            <Icon
              name={IconName.Rocket}
              size={IconSize.Xl}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </Box>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          twClassName="mt-5 text-center"
        >
          {strings('virtual_bank_account.create_virtual_bank_account.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings(
            'virtual_bank_account.create_virtual_bank_account.description',
          )}
        </Text>

        <Box twClassName="mt-8 gap-6 rounded-3xl bg-muted p-5">
          <BenefitRow
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_receive_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_receive_description',
            )}
          />
          <BenefitRow
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_add_money_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_add_money_description',
            )}
          />
          <BenefitRow
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_currencies_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.benefit_currencies_description',
            )}
          />
        </Box>
      </ScrollView>

      <Box twClassName="p-4 gap-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAccepting}
          isDisabled={!canAgreeAndContinue}
          onPress={handleAgreeAndContinue}
          testID={
            CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON
          }
        >
          {strings('virtual_bank_account.create_virtual_bank_account.button')}
        </Button>
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
            color={TextColor.TextMuted}
            twClassName="px-2 text-center"
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
                  color={TextColor.PrimaryDefault}
                  onPress={() => Linking.openURL(disclaimer.url)}
                  testID={`${CreateVirtualBankAccountSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
                >
                  {disclaimer.display_name}
                </Text>
              </React.Fragment>
            ))}
          </Text>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default CreateVirtualBankAccount;
