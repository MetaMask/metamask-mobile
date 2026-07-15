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
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import { KYC_REDIRECT_URL } from '../../constants';
import OnboardingStep from './OnboardingStep';
import AnimatedSpinner from '../../../AnimatedSpinner';

/**
 * Approves the Immersve `funding` prerequisite (an on-chain smart-contract
 * write, e.g. an ERC-20 approve on Base USDC) and, once settled, creates the
 * card. Reached only via useImmersveOnboardingRouter's `funding` case.
 */
const ImmersveFundingApproval = () => {
  const navigation = useNavigation();
  const { countryKey } = useParams<{ countryKey?: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const route = useImmersveOnboardingRouter();
  const hasCreatedCard = useRef(false);

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
    });
  const {
    executeFunding,
    createCard,
    isLoading: isSubmitting,
    error: fundingError,
  } = useImmersveFunding();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen: CardScreens.FUNDING_APPROVAL })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const handleCreateCard = useCallback(async () => {
    if (!fundingSourceId) {
      return;
    }
    hasCreatedCard.current = true;
    try {
      await createCard(fundingSourceId);
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    } catch {
      hasCreatedCard.current = false;
    }
  }, [createCard, fundingSourceId, navigation]);

  const handleApprove = useCallback(() => {
    if (!nextAction || nextAction.type !== 'funding') {
      return;
    }
    executeFunding(nextAction.write)
      .then(() => refresh())
      .catch(() => undefined);
  }, [nextAction, executeFunding, refresh]);

  useEffect(() => {
    if (!nextAction) {
      return;
    }
    if (nextAction.type === 'active') {
      if (!hasCreatedCard.current) {
        handleCreateCard();
      }
    } else if (nextAction.type !== 'funding') {
      // Defensive fallback (resume/regression edge case) — this screen is only
      // reached via the 'funding' next-action; anything else routes normally.
      route(nextAction, { countryKey });
    }
  }, [nextAction, handleCreateCard, route, countryKey]);

  // A poll-only error (e.g. a transient network blip while waiting for
  // settlement) retries with another poll, not a re-approve/re-create, so a
  // successful on-chain approve is never silently resubmitted.
  const handleRetry = useCallback(() => {
    if (fundingError) {
      if (nextAction?.type === 'active') {
        handleCreateCard();
      } else {
        handleApprove();
      }
      return;
    }
    refresh().catch(() => undefined);
  }, [fundingError, nextAction, handleCreateCard, handleApprove, refresh]);

  const displayError = fundingError || error;
  const isBusy = isLoading || isSubmitting;

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      {displayError ? (
        <>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-error-default px-4 mb-4"
            testID="immersve-funding-approval-error"
          >
            {displayError}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleRetry}
            testID="immersve-funding-approval-retry-button"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.retry_button',
            )}
          </Button>
        </>
      ) : !isBusy && nextAction?.type === 'funding' ? (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleApprove}
          testID="immersve-funding-approval-confirm-button"
        >
          {strings(
            'card.card_onboarding.immersve_funding_approval.confirm_button',
          )}
        </Button>
      ) : (
        <>
          <AnimatedSpinner testID="immersve-funding-approval-spinner" />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-text-alternative mt-4 px-4"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.helper_text',
            )}
          </Text>
        </>
      )}
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.immersve_funding_approval.title')}
      description={strings(
        'card.card_onboarding.immersve_funding_approval.description',
      )}
      formFields={renderFormFields()}
      actions={null}
      headerMode="close-direct"
    />
  );
};

export default ImmersveFundingApproval;
