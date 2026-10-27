import React, { useCallback, useEffect, useState } from 'react';
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
  FontWeight,
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
import { strings } from '../../../../../../locales/i18n';
import MoonPayLogo from './assets/moonpay-logo.svg';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import VbaProviderTermsSheet from './ProviderTermsSheet';
import { useKycSessionDisclaimers } from '../../hooks/useKycSessionDisclaimers';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { trackVbaEvent } from '../../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { buildKycBaseProperties } from '../../utils/kycBaseProperties';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  type KycScreenContentState,
} from '../../kycScreenPerformance';

const trackIdentityTerms = (status: 'viewed' | 'accepted' | 'failed') =>
  trackVbaEvent(MetaMetricsEvents.KYC_IDENTITY_TERMS_UPDATED, () => ({
    ...buildKycBaseProperties(),
    status,
  }));

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

  useEffect(() => {
    trackIdentityTerms('viewed');
  }, []);

  // Fires when the session terms fail to load, not on each render.
  useEffect(() => {
    if (error) {
      trackIdentityTerms('failed');
    }
  }, [error]);

  const handleAgree = useCallback(async () => {
    trackIdentityTerms('accepted');
    await onSuccess();
  }, [onSuccess]);

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
          <MoonPayLogo name="moonpay-logo" width={77} height={18} />
        </Box>
      </SafeAreaView>

      {isTermsSheetOpen && disclaimers ? (
        <VbaProviderTermsSheet
          disclaimers={disclaimers}
          onAgree={handleAgree}
          onClose={closeTermsSheet}
        />
      ) : null}
    </Box>
  );
};

export default VbaVerifyIdentity;
