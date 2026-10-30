import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { strings } from '../../../../../../locales/i18n';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import VbaProviderTermsSheet from './ProviderTermsSheet';
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import {
  KYC_CONSENT_VENDOR,
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
  type KycConsentVendor,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  type KycScreenContentState,
} from '../../kycScreenPerformance';

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
  /**
   * Consent sheet variant. Defaults to VBA. `kalshi` is unused until a Kalshi
   * KYC entry point exists.
   */
  vendor?: KycConsentVendor;
}

/**
 * Provider terms step of identity verification. The footer links MetaMask's
 * Terms and Conditions and Privacy Policy, which the user accepts with
 * Agree & Continue. That opens the "Data and privacy" sheet with the idOS and
 * SumSub documents; agreeing there calls `onSuccess`.
 */
const VbaVerifyIdentity = ({
  onSuccess,
  vendor = KYC_CONSENT_VENDOR.VBA,
}: VbaVerifyIdentityProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } = useKycSessionDisclaimers();
  const [isTermsSheetOpen, setIsTermsSheetOpen] = useState(false);

  let identityTermsContentState: KycScreenContentState =
    KYC_SCREEN_CONTENT_STATE.EMPTY;
  if (error) {
    identityTermsContentState = KYC_SCREEN_CONTENT_STATE.ERROR;
  } else if (disclaimers?.length) {
    identityTermsContentState = KYC_SCREEN_CONTENT_STATE.POPULATED;
  }

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
    contentReady: !isLoading,
    contentState: identityTermsContentState,
  });

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
  const openMetaMaskTerms = useCallback(
    () => openExternalUrl(METAMASK_TERMS_URL),
    [],
  );
  const openMetaMaskPrivacyPolicy = useCallback(
    () => openExternalUrl(METAMASK_PRIVACY_POLICY_URL),
    [],
  );

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
          <TitleStandard
            title={strings('virtual_bank_account.verify_identity.title')}
            bottomLabel={strings(
              'virtual_bank_account.verify_identity.description',
            )}
            twClassName="px-4 pb-4"
          />
          <Box>
            {VERIFICATION_STEPS.map((step) => (
              <ListItem
                key={step.id}
                variant={ListItemVariant.OneLine}
                avatar={
                  <AvatarIcon
                    iconName={step.icon}
                    severity={AvatarIconSeverity.Neutral}
                    size={AvatarIconSize.Lg}
                  />
                }
                title={strings(step.title)}
                testID={`${VbaVerifyIdentitySelectorsIDs.STEP}-${step.id}`}
              />
            ))}
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
                <TextButton
                  variant={TextVariant.BodySm}
                  onPress={retry}
                  testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_RETRY}
                >
                  {strings(
                    'virtual_bank_account.verify_identity.disclaimers_retry',
                  )}
                </TextButton>
              </Text>
            </Box>
          ) : null}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings(
              'virtual_bank_account.verify_identity.footer_agreement_start',
            )}
            <TextButton
              variant={TextVariant.BodySm}
              onPress={openMetaMaskTerms}
              testID={VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK}
            >
              {strings('virtual_bank_account.verify_identity.footer_terms')}
            </TextButton>
            {strings('virtual_bank_account.verify_identity.footer_and')}
            <TextButton
              variant={TextVariant.BodySm}
              onPress={openMetaMaskPrivacyPolicy}
              testID={
                VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK
              }
            >
              {strings(
                'virtual_bank_account.verify_identity.footer_privacy_policy',
              )}
            </TextButton>
            {strings(
              'virtual_bank_account.verify_identity.footer_agreement_end',
            )}
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
            {strings(
              'virtual_bank_account.verify_identity.agree_and_continue_button',
            )}
          </Button>
        </Box>
      </SafeAreaView>

      {isTermsSheetOpen && disclaimers ? (
        <VbaProviderTermsSheet
          disclaimers={disclaimers}
          onAgree={onSuccess}
          onClose={closeTermsSheet}
          vendor={vendor}
        />
      ) : null}
    </Box>
  );
};

export default VbaVerifyIdentity;
