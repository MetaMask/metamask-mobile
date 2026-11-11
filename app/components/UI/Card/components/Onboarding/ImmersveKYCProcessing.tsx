import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectImmersveFundingSourceId } from '../../../../../core/redux/slices/card';
import { selectCardSelectedCountry } from '../../../../../selectors/cardController';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useImmersveMoneyAccountFundingApproval } from '../../hooks/useImmersveMoneyAccountFundingApproval';
import { useIsImmersveMoneyAccountCountry } from '../../hooks/useImmersveFundingChannel';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
  withCardProvider,
} from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { KYC_REDIRECT_URL } from '../../constants';
import {
  setImmersveKycOnClose,
  clearImmersveKycOnClose,
} from '../ImmersveKYCModal/ImmersveKYCModal';
import OnboardingStep from './OnboardingStep';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import ImmersveVerifyingIdentityAnimation from './ImmersveVerifyingIdentityAnimation';

// While the user waits on this screen, poll spending-prerequisites; give up after
// this window, send them to Card home (KYC still pending). Immersve
// permits 2-3 min of direct-integration polling — we keep the 30s used by the
// Veriff progress screen since real background checks take minutes to days.
const POLLING_TIMEOUT_MS = 30000;

/**
 * Immersve KYC progress orchestrator (Immersve-conducted, direct integration).
 * After contact details are submitted, this screen drives
 * `spending-prerequisites`: opens the hosted KYC webview, then polls to a
 * terminal state.
 * - kyc (+url) → open the Immersve KYC webview modal (once)
 * - pending    → spinner + auto-poll; 30s timeout → Card home (pending)
 * - rejected   → KYC_FAILED (blocked / kyc_check_failed)
 * - active/funding (approved) → interim terminus (branch 6b wires SpendingLimit)
 */
const ImmersveKYCProcessing = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const headerHandlers = useCardHeaderHandlers('close-direct');
  const isDarkTheme = useTheme().themeAppearance === AppThemeKey.dark;
  // The reopen prompt does not use OnboardingStep, so it has to set the status
  // bar itself. The spinner path's OnboardingStep sets the same style.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(
        isDarkTheme ? 'light-content' : 'dark-content',
        true,
      );
    }, [isDarkTheme]),
  );
  const { countryKey, kycUrl } = useParams<{
    countryKey?: string;
    kycUrl?: string;
  }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const selectedCountry = useSelector(selectCardSelectedCountry);
  const fundingCountry = countryKey ?? selectedCountry ?? undefined;
  const isMoneyAccountCountry =
    useIsImmersveMoneyAccountCountry(fundingCountry);
  const { approveFunding } = useImmersveMoneyAccountFundingApproval();
  const route = useImmersveOnboardingRouter();
  const hasOpenedWebview = useRef(false);
  const hasStartedFundingApproval = useRef(false);

  const openKycWebview = useCallback(
    (url: string) => {
      hasOpenedWebview.current = true;
      navigation.navigate(Routes.CARD.ONBOARDING.IMMERSVE_KYC, {
        url,
        redirectUrl: KYC_REDIRECT_URL,
      });
    },
    [navigation],
  );

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
      pollIntervalMs: 2000,
    });

  const ctaHint = nextAction?.type === 'kyc' ? nextAction.ctaHint : undefined;
  const isInfoNeeded = ctaHint === 'KYC_INFORMATION_NEEDED';
  const promptHint = ctaHint === 'KYC_NOT_COMPLETED' || isInfoNeeded;
  const isExpiring = ctaHint === 'KYC_EXPIRING';

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.KYC_PROCESSING,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  // Initial poll (needed for the resume/no-url entry).
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  // Entry shortcut: SignUp already derived the KYC url, so open the webview
  // immediately instead of re-polling and flashing the spinner first.
  useEffect(() => {
    if (kycUrl && !hasOpenedWebview.current) {
      openKycWebview(kycUrl);
    }
  }, [kycUrl, openKycWebview]);

  // Re-poll when the webview closes back onto this screen. Exit to the wallet
  // tears this screen down before focus returns, so useFocusEffect cannot be
  // the signal — the webview invokes this callback instead. The poll then
  // decides: kyc still action-required ⇒ the user bailed (show a reopen
  // prompt); otherwise route.
  useEffect(() => {
    setImmersveKycOnClose(() => {
      refresh().catch(() => undefined);
    });
    return () => clearImmersveKycOnClose();
  }, [refresh]);

  useEffect(() => {
    if (!nextAction) {
      return;
    }
    const { type } = nextAction;
    if (type === 'kyc') {
      // Auto-open the webview the first time only, and only when the backend
      // hasn't told us to prompt instead (KYC_NOT_COMPLETED / KYC_INFORMATION_NEEDED
      // ⇒ show the button, never silently reopen; KYC_EXPIRING ⇒ error).
      if (!hasOpenedWebview.current && !promptHint && !isExpiring) {
        openKycWebview(nextAction.url ?? '');
      }
    } else if (type === 'funding' || type === 'active' || type === 'rejected') {
      // Money account approval has no screen of its own. Start it before
      // leaving so Card Home mounts with the link already in progress.
      if (
        type === 'funding' &&
        isMoneyAccountCountry &&
        !hasStartedFundingApproval.current
      ) {
        hasStartedFundingApproval.current = true;
        approveFunding(CardEntryPoint.SIGN_UP).catch(() => undefined);
      }
      route(nextAction, { countryKey });
    }
  }, [
    nextAction,
    navigation,
    route,
    countryKey,
    isMoneyAccountCountry,
    approveFunding,
    openKycWebview,
    promptHint,
    isExpiring,
  ]);

  // 30s cutoff only while background checks are pending (not during the webview).
  useEffect(() => {
    if (nextAction?.type !== 'pending') {
      return undefined;
    }
    const id = setTimeout(() => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.KYC_PENDING_TIMEOUT,
              screen: CardScreens.KYC_PROCESSING,
            }),
          )
          .build(),
      );
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME, params: { fromKycPending: true } }],
      });
    }, POLLING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [nextAction?.type, navigation, trackEvent, createEventBuilder]);

  // User came back from the webview with KYC still outstanding ⇒ prompt to reopen
  // (never auto-reopen — they may have closed it deliberately). The backend
  // ctaHint (promptHint) forces the prompt even on a fresh mount; !isLoading gates
  // the in-flight re-poll after a *completed* KYC so it shows the spinner, not a
  // flash of this prompt.
  const isReopenPrompt =
    !isLoading &&
    nextAction?.type === 'kyc' &&
    (hasOpenedWebview.current || promptHint) &&
    !isExpiring;

  const errorMessage =
    error ??
    (isExpiring
      ? strings('card.card_onboarding.immersve_kyc_processing.expiring_error')
      : null);

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      {errorMessage ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.ErrorDefault}
          twClassName="text-center px-4"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="immersve-kyc-processing-error"
        >
          {errorMessage}
        </Text>
      ) : (
        <>
          <Spinner
            testID="immersve-kyc-processing-spinner"
            spinnerIconProps={{ size: IconSize.Xl }}
          />
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center mt-4 px-4"
          >
            {strings(
              'card.card_onboarding.immersve_kyc_processing.helper_text',
            )}
          </Text>
        </>
      )}
    </Box>
  );

  const handleReopen = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.KYC_REOPEN,
            cta_hint: ctaHint,
          }),
        )
        .build(),
    );
    openKycWebview((nextAction?.type === 'kyc' && nextAction.url) || '');
  }, [trackEvent, createEventBuilder, ctaHint, openKycWebview, nextAction]);

  if (isReopenPrompt) {
    const title = strings(
      isInfoNeeded
        ? 'card.card_onboarding.immersve_kyc_processing.info_needed_title'
        : 'card.card_onboarding.immersve_kyc_processing.incomplete_title',
    );
    const description = strings(
      isInfoNeeded
        ? 'card.card_onboarding.immersve_kyc_processing.info_needed_description'
        : 'card.card_onboarding.immersve_kyc_processing.incomplete_description',
    );
    const buttonLabel = strings(
      isInfoNeeded
        ? 'card.card_onboarding.immersve_kyc_processing.info_needed_button'
        : 'card.card_onboarding.immersve_kyc_processing.continue_button',
    );

    return (
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
        >
          <TitleStandard
            title={title}
            bottomLabel={description}
            titleProps={{
              twClassName: 'text-center',
              testID: 'onboarding-title',
            }}
            titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
            bottomLabelProps={{
              twClassName: 'text-center',
              testID: 'onboarding-description',
            }}
            bottomLabelWrapperProps={{
              justifyContent: BoxJustifyContent.Center,
            }}
            topAccessory={
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="mb-5 w-full overflow-hidden"
                testID="immersve-kyc-processing-illustration"
              >
                <ImmersveVerifyingIdentityAnimation />
              </Box>
            }
          />
        </ScrollView>
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleReopen}
            testID="immersve-kyc-processing-reopen-button"
          >
            {buttonLabel}
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.immersve_kyc_processing.title')}
      description={strings(
        'card.card_onboarding.immersve_kyc_processing.description',
      )}
      formFields={renderFormFields()}
      headerMode="close-direct"
    />
  );
};

export default ImmersveKYCProcessing;
