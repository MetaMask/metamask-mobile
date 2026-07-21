import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectCardActiveProviderId } from '../../../../../../selectors/cardController';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

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

  useEffect(() => {
    if (!isProvisioning) return undefined;

    const interval = setInterval(() => {
      Engine.context.CardController.fetchCardHomeData().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isProvisioning]);

  return { isProvisioning };
}
