import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardStatus } from '../types';

type CardFreezeStatus =
  | { type: 'idle' }
  | { type: 'toggling' }
  | { type: 'error'; error: Error };

interface UseCardFreezeParams {
  cardStatus: CardStatus | undefined;
  fetchCardDetails: () => Promise<unknown>;
}

interface UseCardFreezeResult {
  isFrozen: boolean;
  status: CardFreezeStatus;
  toggleFreeze: () => Promise<void>;
}

const useCardFreeze = ({
  cardStatus,
  fetchCardDetails,
}: UseCardFreezeParams): UseCardFreezeResult => {
  const { sdk } = useCardSDK();
  const [status, setStatus] = useState<CardFreezeStatus>({ type: 'idle' });
  const [optimisticStatus, setOptimisticStatus] = useState<CardStatus | null>(
    null,
  );

  const effectiveStatus = optimisticStatus ?? cardStatus;
  const isFrozen = effectiveStatus === CardStatus.FROZEN;

  const toggleFreeze = useCallback(async () => {
    if (!sdk || status.type === 'toggling') {
      return;
    }

    if (cardStatus !== CardStatus.ACTIVE && cardStatus !== CardStatus.FROZEN) {
      return;
    }

    const nextStatus =
      cardStatus === CardStatus.ACTIVE ? CardStatus.FROZEN : CardStatus.ACTIVE;

    setOptimisticStatus(nextStatus);
    setStatus({ type: 'toggling' });

    try {
      if (cardStatus === CardStatus.ACTIVE) {
        await sdk.freezeCard();
      } else {
        await sdk.unfreezeCard();
      }

      await fetchCardDetails();
      setStatus({ type: 'idle' });
    } catch (err) {
      setOptimisticStatus(null);
      setStatus({
        type: 'error',
        error: err instanceof Error ? err : new Error('Unknown error'),
      });
    } finally {
      setOptimisticStatus(null);
    }
  }, [sdk, cardStatus, status.type, fetchCardDetails]);

  return {
    isFrozen,
    status,
    toggleFreeze,
  };
};

export default useCardFreeze;
export type { CardFreezeStatus };
