import type {
  CollectorCryptCard,
  CollectorCryptErrorState,
  PackOperation,
  PackOperationStatus,
} from '../../providers/collector-crypt/types';
import { getPackPriceBaseUnits } from '../../components/PackCard/PackCard.utils';
import { parseBaseUnits } from '../../providers/collector-crypt/utils/format';

export type RevealStage = 'signing' | 'paying' | 'opening';

export type RevealState =
  | { kind: 'processing'; stage: RevealStage }
  | {
      kind: 'error';
      error: CollectorCryptErrorState;
      /** Resumable operation: `completePack` can run again. */
      canRetry: boolean;
      /** Never paid and expired: the same pack can be bought again. */
      canStartOver: boolean;
    }
  | { kind: 'revealed'; card: CollectorCryptCard };

const STAGE_BY_STATUS: Partial<Record<PackOperationStatus, RevealStage>> = {
  generated: 'signing',
  signed: 'paying',
  submitted: 'opening',
  paid: 'opening',
};

export const REVEAL_STAGE_LABEL_KEYS: Record<RevealStage, string> = {
  signing: 'gacha.reveal.signing',
  paying: 'gacha.reveal.paying',
  opening: 'gacha.reveal.opening',
};

const errorState = (
  error: CollectorCryptErrorState,
  { canRetry = false, canStartOver = false } = {},
): RevealState => ({ kind: 'error', error, canRetry, canStartOver });

/** What the reveal screen shows for an operation, its card and the local run state. */
export const getRevealState = ({
  operation,
  card,
  isCompleting,
  localError,
}: {
  operation: PackOperation | undefined;
  card: CollectorCryptCard | undefined;
  isCompleting: boolean;
  localError?: CollectorCryptErrorState;
}): RevealState => {
  if (!operation) {
    return errorState({ code: 'NOT_FOUND' });
  }
  switch (operation.status) {
    case 'opened':
      if (card) {
        return { kind: 'revealed', card };
      }
      return isCompleting
        ? { kind: 'processing', stage: 'opening' }
        : errorState({ code: 'NOT_FOUND' });
    case 'expired':
      return errorState({ code: 'PACK_EXPIRED' }, { canStartOver: true });
    case 'failed':
      return errorState({ code: 'PACK_FAILED' });
    default: {
      const stage = STAGE_BY_STATUS[operation.status] ?? 'opening';
      const error = operation.error ?? localError;
      if (isCompleting || !error) {
        return { kind: 'processing', stage };
      }
      return errorState(error, { canRetry: true });
    }
  }
};

/** True when balance + buyback refund covers the price of the same pack. */
export const canAffordAnotherPack = ({
  balance,
  refund,
  price,
}: {
  balance: bigint;
  refund: string;
  price: number;
}): boolean => balance + parseBaseUnits(refund) >= getPackPriceBaseUnits(price);

/** Terminal operations are acknowledged (dismissed) when the user leaves. */
export const shouldDismissOnClose = (
  operation: PackOperation | undefined,
): boolean =>
  !operation ||
  operation.status === 'opened' ||
  operation.status === 'expired' ||
  operation.status === 'failed';
