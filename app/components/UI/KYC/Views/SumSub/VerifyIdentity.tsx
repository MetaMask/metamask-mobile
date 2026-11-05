import React, { useCallback, useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  useKycSessionDisclaimers,
  type KycCatalogDisclaimerLink,
} from '../../hooks/useKycSessionDisclaimers';
import { trackIdentityTerms } from '../../utils/identityTermsAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  type KycScreenContentState,
} from '../../kycScreenPerformance';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import SentenceWithLinks from '../../components/SentenceWithLinks';

/** Pages the identity-verification terms are split across ("1 of 2"). */
const TOTAL_PAGES = 2;

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
    icon: IconName.Details,
    title: 'virtual_bank_account.verify_identity.step_confirm_details',
  },
  {
    id: 'answer-questions',
    icon: IconName.Question,
    title: 'virtual_bank_account.verify_identity.step_answer_questions',
  },
] as const;

const BENEFITS = [
  {
    id: 'reuse',
    icon: IconName.Flash,
    title: 'virtual_bank_account.verify_identity.benefit_reuse_title',
    description:
      'virtual_bank_account.verify_identity.benefit_reuse_description',
  },
  {
    id: 'control',
    icon: IconName.Key,
    title: 'virtual_bank_account.verify_identity.benefit_control_title',
    description:
      'virtual_bank_account.verify_identity.benefit_control_description',
  },
] as const;

interface VbaVerifyIdentityProps {
  /** Hands the loaded catalog to the verification-partners page. */
  onContinue: (disclaimers: KycCatalogDisclaimerLink[]) => void;
}

/**
 * Page 1 of identity verification: what the user is about to do, who verifies
 * it, and the MetaMask consent needed to pass their details to idOS.
 *
 * The idOS / SumSub catalog is fetched here even though it is only rendered on
 * page 2, so the request runs while the user reads this page and page 2 has no
 * loading state of its own. Continue stays disabled until it lands — the user
 * cannot be sent to a terms page with no terms on it.
 */
const VbaVerifyIdentity = ({ onContinue }: VbaVerifyIdentityProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } = useKycSessionDisclaimers();

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

  // Page 2 can't be shown without the idOS / SumSub terms to review.
  const canContinue = !isLoading && !error && Boolean(disclaimers?.length);

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  useEffect(() => {
    trackIdentityTerms('page1_viewed');
  }, []);

  // Fires when the session terms fail to load, not on each render.
  useEffect(() => {
    if (error) {
      trackIdentityTerms('failed');
    }
  }, [error]);

  const handleContinue = useCallback(() => {
    if (!disclaimers?.length) {
      return;
    }
    trackIdentityTerms('page1_accepted');
    onContinue(disclaimers);
  }, [disclaimers, onContinue]);

  const stepIndicator = (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      accessibilityLabel={strings(
        'wallet.home_onboarding_steps.progress_a11y',
        {
          current: 1,
          total: TOTAL_PAGES,
        },
      )}
      testID={VbaVerifyIdentitySelectorsIDs.STEP_INDICATOR}
    >
      {strings('virtual_bank_account.verify_identity.step_indicator', {
        current: 1,
        total: TOTAL_PAGES,
      })}
    </Text>
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={handleBack}
          backButtonProps={{
            testID: VbaVerifyIdentitySelectorsIDs.BACK_BUTTON,
          }}
          // On the glass path custom accessories are not capsuled for us.
          endAccessory={
            isGlassHeader ? (
              <CapsuleGlass twClassName="px-3">{stepIndicator}</CapsuleGlass>
            ) : (
              <Box twClassName="pr-1">{stepIndicator}</Box>
            )
          }
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          testID={VbaVerifyIdentitySelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={strings('virtual_bank_account.verify_identity.title')}
            bottomLabel={strings(
              'virtual_bank_account.verify_identity.subtitle',
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

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="px-4 pb-1 pt-6"
          >
            {strings('virtual_bank_account.verify_identity.partner_title')}
          </Text>
          <Box>
            {BENEFITS.map((benefit) => (
              <ListItem
                key={benefit.id}
                variant={ListItemVariant.TwoLines}
                avatar={
                  <AvatarIcon
                    iconName={benefit.icon}
                    severity={AvatarIconSeverity.Neutral}
                    size={AvatarIconSize.Lg}
                  />
                }
                title={strings(benefit.title)}
                description={strings(benefit.description)}
                testID={`${VbaVerifyIdentitySelectorsIDs.BENEFIT}-${benefit.id}`}
              />
            ))}
          </Box>
        </ScrollView>

        <Box twClassName="gap-4 border-t border-muted px-4 pb-2 pt-4">
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
          <SentenceWithLinks
            i18nKey="virtual_bank_account.verify_identity.agreement"
            twClassName="text-center"
            testID={VbaVerifyIdentitySelectorsIDs.AGREEMENT}
            links={{
              termsOfUse: {
                label: strings(
                  'virtual_bank_account.verify_identity.agreement_terms_of_use',
                ),
                url: METAMASK_TERMS_URL,
                testID: VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK,
              },
              privacyNotice: {
                label: strings(
                  'virtual_bank_account.verify_identity.agreement_privacy_notice',
                ),
                url: METAMASK_PRIVACY_POLICY_URL,
                testID:
                  VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK,
              },
            }}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!canContinue}
            isLoading={isLoading}
            onPress={handleContinue}
            testID={VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON}
          >
            {strings(
              'virtual_bank_account.verify_identity.agree_and_continue_button',
            )}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default VbaVerifyIdentity;
