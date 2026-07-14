import React, { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectImmersveFundingSourceId } from '../../../../../core/redux/slices/card';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import OnboardingStep from './OnboardingStep';
import AnimatedSpinner from '../../../AnimatedSpinner';

// Fixed sentinel Immersve redirects the user to when they exit the hosted KYC
// UI; the webview watches for it to know onboarding-in-webview is done.
export const KYC_REDIRECT_URL = 'https://metamask.io/card/kyc-complete';

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
  const { countryKey } = useParams<{ countryKey?: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const hasOpenedWebview = useRef(false);

  const { nextAction, refresh } = useImmersveSpendingPrerequisites({
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

  // Re-poll on entry and whenever the webview modal is dismissed back to here.
  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  useEffect(() => {
    if (!nextAction) {
      return;
    }
    const { type } = nextAction;
    if (type === 'kyc') {
      // Open the hosted KYC webview once; re-poll (not re-open) drives the rest.
      if (!hasOpenedWebview.current) {
        hasOpenedWebview.current = true;
        navigation.navigate(Routes.CARD.MODALS.ID, {
          screen: Routes.CARD.MODALS.IMMERSVE_KYC,
          params: { url: nextAction.url ?? '', redirectUrl: KYC_REDIRECT_URL },
        });
      }
    } else if (type === 'rejected') {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
      });
    } else if (type === 'funding' || type === 'active') {
      // ponytail: interim terminus — approved users park on the pending screen.
      // Branch 6b replaces this with SpendingLimit + ERC-20 approve + createCard.
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_PENDING }],
      });
    }
    // ponytail: 'contact'/'expected_spend' shouldn't occur (contact pre-supplied,
    // expected-spend collected in-webview); left on the spinner if they do.
  }, [nextAction, navigation]);

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

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      <AnimatedSpinner testID="immersve-kyc-processing-spinner" />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-text-alternative mt-4 px-4"
      >
        {strings('card.card_onboarding.immersve_kyc_processing.helper_text')}
      </Text>
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.immersve_kyc_processing.title')}
      description={strings(
        'card.card_onboarding.immersve_kyc_processing.description',
      )}
      formFields={renderFormFields()}
      actions={null}
      headerMode="close-direct"
    />
  );
};

export default ImmersveKYCProcessing;
