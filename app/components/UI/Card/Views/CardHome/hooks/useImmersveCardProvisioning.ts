import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectCardActiveProviderId,
  selectCardSelectedCountry,
} from '../../../../../../selectors/cardController';
import { selectCardFeatureFlag } from '../../../../../../selectors/featureFlagController/card';
import {
  selectImmersveFundingSourceId,
  setImmersveFundingSourceId,
} from '../../../../../../core/redux/slices/card';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { KYC_REDIRECT_URL } from '../../../constants';
import { deriveNextImmersveAction } from '../../../util/immersvePrerequisites';
import { resolveImmersveFundingSourceId } from '../../../util/immersveResume';
import { useImmersveOnboardingRouter } from '../../../hooks/useImmersveOnboardingRouter';

const POLL_INTERVAL_MS = 5000;

export function useImmersveCardProvisioning(
  data: CardHomeData | null | undefined,
) {
  const providerId = useSelector(selectCardActiveProviderId);
  const isProvisioning =
    providerId === 'immersve' &&
    (data?.alerts ?? []).some(
      (cardAlert) => cardAlert.type === 'card_provisioning',
    );

  const reduxFundingSourceId = useSelector(selectImmersveFundingSourceId);
  const kycRegion = useSelector(selectCardSelectedCountry) ?? undefined;
  const fundingChannelId = useSelector(selectCardFeatureFlag).immersve
    ?.fundingChannelId;
  const route = useImmersveOnboardingRouter();
  const dispatch = useDispatch();
  const handled = useRef(false);

  useEffect(() => {
    if (!isProvisioning) return undefined;

    const interval = setInterval(() => {
      Engine.context.CardController.fetchCardHomeData().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isProvisioning]);

  useEffect(() => {
    if (!isProvisioning || handled.current) {
      return undefined;
    }
    handled.current = true;
    let cancelled = false;
    (async () => {
      try {
        const controller = Engine.context.CardController;
        const id = await resolveImmersveFundingSourceId({
          fundingChannelId,
          existingId: reduxFundingSourceId,
        });
        if (cancelled) return;
        if (!reduxFundingSourceId) {
          dispatch(setImmersveFundingSourceId(id));
        }
        const { prerequisites } = await controller.getSpendingPrerequisites(
          id,
          { kycRegion, kycRedirectUrl: KYC_REDIRECT_URL },
        );
        if (cancelled) return;
        const action = deriveNextImmersveAction(prerequisites);
        if (action.type === 'active') {
          await controller.createCard(id);
        } else {
          route(action, { navigateFromRoot: true, countryKey: kycRegion });
        }
      } catch (error) {
        if (
          error instanceof CardProviderError &&
          error.code === CardProviderErrorCode.Conflict
        ) {
          return;
        }
        handled.current = false;
        Logger.error(error as Error, {
          tags: { feature: 'card', provider: 'immersve' },
          context: {
            name: 'useImmersveCardProvisioning',
            data: { method: 'reconcile' },
          },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isProvisioning,
    reduxFundingSourceId,
    kycRegion,
    fundingChannelId,
    route,
    dispatch,
  ]);

  return { isProvisioning };
}
