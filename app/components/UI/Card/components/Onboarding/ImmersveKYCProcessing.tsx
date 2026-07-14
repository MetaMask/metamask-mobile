import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectImmersveFundingSourceId } from '../../../../../core/redux/slices/card';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import { KYC_REDIRECT_URL } from '../../constants';
import {
  setImmersveKycOnClose,
  clearImmersveKycOnClose,
} from '../ImmersveKYCModal/ImmersveKYCModal';
import OnboardingStep from './OnboardingStep';
import AnimatedSpinner from '../../../AnimatedSpinner';

// While the user waits on this screen, poll spending-prerequisites; give up after
// this window and send them to the "we'll notify you" pending screen. Immersve
// permits 2-3 min of direct-integration polling — we keep the 30s used by the
// Veriff progress screen since real background checks take minutes to days.
const POLLING_TIMEOUT_MS = 30000;

/**
 * Immersve KYC progress orchestrator (Immersve-conducted, direct integration).
 * After contact details are submitted, this screen drives
 * `spending-prerequisites`: opens the hosted KYC webview, then polls to a
 * terminal state.
 * - kyc (+url) → open the Immersve KYC webview modal (once)
 * - pending    → spinner + auto-poll; 30s timeout → KYC_PENDING
 * - rejected   → KYC_FAILED (blocked / kyc_check_failed)
 * - active/funding (approved) → interim terminus (branch 6b wires SpendingLimit)
 */
const ImmersveKYCProcessing = () => {
  const navigation = useNavigation();
  const { countryKey, kycUrl } = useParams<{
    countryKey?: string;
    kycUrl?: string;
  }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const route = useImmersveOnboardingRouter();
  const hasOpenedWebview = useRef(false);

  const openKycWebview = useCallback(
    (url: string) => {
      hasOpenedWebview.current = true;
      navigation.navigate(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.IMMERSVE_KYC,
        params: { url, redirectUrl: KYC_REDIRECT_URL },
      });
    },
    [navigation],
  );

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
    });

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen: CardScreens.KYC_PROCESSING })
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

  // Re-poll when the webview closes. The transparentModal keeps this screen
  // mounted without blurring it, so useFocusEffect can't detect the close — the
  // modal invokes this callback instead. The poll then decides: kyc still
  // action-required ⇒ the user bailed (show a reopen prompt); otherwise route.
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
      // Auto-open the webview the first time only; after the user has been there
      // once, a re-poll that still returns kyc means they closed it without
      // finishing → the reopen prompt (below) takes over instead of re-opening.
      if (!hasOpenedWebview.current) {
        openKycWebview(nextAction.url ?? '');
      }
    } else if (type === 'funding' || type === 'active' || type === 'rejected') {
      route(nextAction, { countryKey });
    }
  }, [nextAction, navigation, route, countryKey, openKycWebview]);

  // 30s cutoff only while background checks are pending (not during the webview).
  useEffect(() => {
    if (nextAction?.type !== 'pending') {
      return undefined;
    }
    const id = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    }, POLLING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [nextAction?.type, navigation]);

  // User came back from the webview with KYC still outstanding ⇒ prompt to reopen
  // (never auto-reopen — they may have closed it deliberately). Gated on !isLoading
  // so the in-flight re-poll after a *completed* KYC shows the spinner, not a flash
  // of this prompt.
  const isReopenPrompt =
    !isLoading && nextAction?.type === 'kyc' && hasOpenedWebview.current;

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      {error ? (
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-error-default px-4"
          testID="immersve-kyc-processing-error"
        >
          {error}
        </Text>
      ) : isReopenPrompt ? (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={() =>
            openKycWebview((nextAction?.type === 'kyc' && nextAction.url) || '')
          }
          testID="immersve-kyc-processing-reopen-button"
        >
          {strings(
            'card.card_onboarding.immersve_kyc_processing.continue_button',
          )}
        </Button>
      ) : (
        <>
          <AnimatedSpinner testID="immersve-kyc-processing-spinner" />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-text-alternative mt-4 px-4"
          >
            {strings(
              'card.card_onboarding.immersve_kyc_processing.helper_text',
            )}
          </Text>
        </>
      )}
    </Box>
  );

  return (
    <OnboardingStep
      title={strings(
        isReopenPrompt
          ? 'card.card_onboarding.immersve_kyc_processing.incomplete_title'
          : 'card.card_onboarding.immersve_kyc_processing.title',
      )}
      description={strings(
        isReopenPrompt
          ? 'card.card_onboarding.immersve_kyc_processing.incomplete_description'
          : 'card.card_onboarding.immersve_kyc_processing.description',
      )}
      formFields={renderFormFields()}
      actions={null}
      headerMode="close-direct"
    />
  );
};

export default ImmersveKYCProcessing;
