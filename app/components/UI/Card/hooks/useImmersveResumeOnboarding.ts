import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setImmersveFundingSourceId } from '../../../../core/redux/slices/card';
import { selectCardImmersveConfig } from '../../../../selectors/featureFlagController/card';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { KYC_REDIRECT_URL } from '../constants';
import { deriveNextImmersveAction } from '../util/immersvePrerequisites';
import { resolveImmersveFundingSourceId } from '../util/immersveResume';
import { CardActions, withCardProvider } from '../util/metrics';
import { getSiweErrorType, useImmersveSiweAuth } from './useImmersveSiweAuth';
import { useImmersveOnboardingRouter } from './useImmersveOnboardingRouter';

interface ResumeParams {
  country: string;
  address: string;
  email?: string;
  phone?: string;
  showAccountExistsToast?: boolean;
  navigateFromRoot?: boolean;
  /** Analytics entrypoint for the resume funnel (`sign_up` | `authentication`). */
  entrypoint?: 'sign_up' | 'authentication';
}

export const useImmersveResumeOnboarding = () => {
  const dispatch = useDispatch();
  const { signIn } = useImmersveSiweAuth();
  const route = useImmersveOnboardingRouter();
  const immersveConfig = useSelector(selectCardImmersveConfig);
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    async ({
      country,
      address,
      email,
      phone,
      showAccountExistsToast,
      navigateFromRoot,
      entrypoint = 'sign_up',
    }: ResumeParams): Promise<void> => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.IMMERSVE_RESUME_ONBOARDING,
              entrypoint,
            }),
          )
          .build(),
      );

      try {
        const controller = Engine.context.CardController;

        controller.setSelectedCountry(country);

        await signIn({ country, address });

        const resume = await controller.getResumeCardInfo();

        const id = await resolveImmersveFundingSourceId({
          fundingChannelId: immersveConfig.fundingChannelId,
          existingId: resume?.fundingSourceIds?.[0],
        });
        dispatch(setImmersveFundingSourceId(id));

        const prerequisitesParams = {
          kycRegion: country,
          kycRedirectUrl: KYC_REDIRECT_URL,
        };

        let { prerequisites } = await controller.getSpendingPrerequisites(
          id,
          prerequisitesParams,
        );
        let nextAction = deriveNextImmersveAction(prerequisites);

        if (nextAction.type === 'contact' && (email || phone)) {
          await controller.patchContactDetails({ email, phone });
          ({ prerequisites } = await controller.getSpendingPrerequisites(
            id,
            prerequisitesParams,
          ));
          nextAction = deriveNextImmersveAction(prerequisites);
        }

        route(nextAction, {
          email,
          countryKey: country,
          showAccountExistsToast,
          navigateFromRoot,
        });
      } catch (error) {
        // SIWE already emits CARD_SIWE_AUTH_FAILED (incl. user_cancelled).
        // Only mark resume as failed for non-cancel errors.
        if (getSiweErrorType(error) !== 'user_cancelled') {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
              .addProperties(
                withCardProvider(CardProviderIds.Immersve, {
                  action: CardActions.IMMERSVE_RESUME_ONBOARDING,
                  entrypoint,
                  status: 'failed',
                }),
              )
              .build(),
          );
        }
        throw error;
      }
    },
    [dispatch, signIn, route, immersveConfig, trackEvent, createEventBuilder],
  );
};
