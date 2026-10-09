import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  ContentVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import MoonPayLogo from './assets/moonpay-logo.svg';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';
import VbaProviderTermsSheet from './VbaProviderTermsSheet';
import { useKycSessionDisclaimers } from './hooks/useKycSessionDisclaimers';

const VERIFICATION_STEPS = [
  {
    id: 'photograph-id',
    icon: IconName.Card,
    title: 'virtual_bank_account.verify_identity.step_photograph_id',
  },
  {
    id: 'take-selfie',
    icon: IconName.FaceId,
    title: 'virtual_bank_account.verify_identity.step_take_selfie',
  },
  {
    id: 'confirm-details',
    icon: IconName.UserCheck,
    title: 'virtual_bank_account.verify_identity.step_confirm_details',
  },
  {
    id: 'answer-questions',
    icon: IconName.Clipboard,
    title: 'virtual_bank_account.verify_identity.step_answer_questions',
  },
] as const;

interface VbaVerifyIdentityProps {
  onSuccess: () => void | Promise<void>;
}

/**
 * Provider terms step of identity verification. Continue opens the
 * "Data and privacy" sheet with the MetaMask, idOS, and SumSub documents;
 * agreeing there calls `onSuccess`.
 */
const VbaVerifyIdentity = ({ onSuccess }: VbaVerifyIdentityProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } = useKycSessionDisclaimers();
  const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);

  // The sheet can't open without the idOS / SumSub terms to review.
  const canContinue = !isLoading && !error && Boolean(disclaimers?.length);

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const openTermsSheet = useCallback(() => setIsTermsSheetOpen(true), []);
  const closeTermsSheet = useCallback(() => setIsTermsSheetOpen(false), []);

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandard
          onBack={handleBack}
          backButtonProps={{
            testID: VbaVerifyIdentitySelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow')}
          testID={VbaVerifyIdentitySelectorsIDs.CONTAINER}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.End}
            twClassName="h-[88px] w-full"
          >
            <VbaIllustration source={VbaIllustrationSource.scanner} />
          </Box>
          <Box twClassName="gap-2 p-4">
            <Text variant={TextVariant.HeadingLg} twClassName="text-center">
              {strings('virtual_bank_account.verify_identity.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('virtual_bank_account.verify_identity.description')}
            </Text>
          </Box>
          <Box twClassName="px-4 py-2.5">
            <Box twClassName="overflow-hidden rounded-3xl bg-muted">
              {VERIFICATION_STEPS.map((step) => (
                <ListItem
                  key={step.id}
                  variant={ContentVariant.OneLine}
                  twClassName="min-h-14"
                  startAccessory={
                    <Icon
                      name={step.icon}
                      size={IconSize.Md}
                      color={IconColor.IconDefault}
                    />
                  }
                  accessoryGap={3}
                  title={strings(step.title)}
                  testID={`${VbaVerifyIdentitySelectorsIDs.STEP}-${step.id}`}
                />
              ))}
            </Box>
          </Box>
        </ScrollView>

        <Box twClassName="gap-4 px-4 pb-2 pt-4">
          {error ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-2"
              testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_ERROR}
            >
              <Box twClassName="shrink-0 pt-0.5">
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.ErrorDefault}
                />
              </Box>
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {strings(
                  'virtual_bank_account.verify_identity.disclaimers_error',
                )}{' '}
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.PrimaryDefault}
                  twClassName="underline"
                  onPress={retry}
                  testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_RETRY}
                >
                  {strings(
                    'virtual_bank_account.verify_identity.disclaimers_retry',
                  )}
                </Text>
              </Text>
            </Box>
          ) : null}
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('virtual_bank_account.verify_identity.footer')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!canContinue}
            isLoading={isLoading}
            onPress={openTermsSheet}
            testID={VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON}
          >
            {strings('virtual_bank_account.verify_identity.button')}
          </Button>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-10 gap-1 opacity-40"
          testID={VbaVerifyIdentitySelectorsIDs.POWERED_BY}
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('virtual_bank_account.verify_identity.powered_by')}
          </Text>
          <MoonPayLogo
            name="moonpay-logo"
            width={77}
            height={18}
            color={tw.color('text-alternative')}
          />
        </Box>
      </SafeAreaView>

      {isTermsSheetOpen && disclaimers ? (
        <VbaProviderTermsSheet
          disclaimers={disclaimers}
          onAgree={onSuccess}
          onClose={closeTermsSheet}
        />
      ) : null}
    </Box>
  );
};

export default VbaVerifyIdentity;
