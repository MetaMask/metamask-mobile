import type {
  CollectiblesCard,
  CollectiblesErrorState,
  CollectiblesPack,
  CollectiblesPackOperation,
  CollectiblesPackOperationStatus,
} from '../../types';

export type RevealStage = 'signing' | 'paying' | 'opening';

export type RevealState =
  | { kind: 'processing'; stage: RevealStage }
  | {
      kind: 'error';
      error: CollectiblesErrorState;
      /** Resumable operation: `completePack` can run again. */
      canRetry: boolean;
      /** Never paid and expired: the same pack can be bought again. */
      canStartOver: boolean;
    }
  | { kind: 'revealed'; card: CollectiblesCard };

const STAGE_BY_STATUS: Partial<
  Record<CollectiblesPackOperationStatus, RevealStage>
> = {
  generated: 'signing',
  // Signed and sent: waiting for PackPartner to confirm the payment.
  submitted: 'paying',
  paid: 'opening',
};

export const REVEAL_STAGE_LABEL_KEYS: Record<RevealStage, string> = {
  signing: 'collectibles.reveal.signing',
  paying: 'collectibles.reveal.paying',
  opening: 'collectibles.reveal.opening',
};

const errorState = (
  error: CollectiblesErrorState,
  { canRetry = false, canStartOver = false } = {},
): RevealState => ({ kind: 'error', error, canRetry, canStartOver });

/** What the reveal screen shows for an operation, its card and the local run state. */
export const getRevealState = ({
  operation,
  card,
  isCompleting,
  localError,
}: {
  operation: CollectiblesPackOperation | undefined;
  card: CollectiblesCard | undefined;
  isCompleting: boolean;
  localError?: CollectiblesErrorState;
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

/**
 * Catalogue entry of the operation's pack. Start over confirms this entry, so
 * the user sees and pays the current price, not the one stored on the operation.
 */
export const getStartOverPack = (
  packs: CollectiblesPack[],
  operation: CollectiblesPackOperation | undefined,
): CollectiblesPack | undefined =>
  operation
    ? packs.find((pack) => pack.code === operation.packCode)
    : undefined;

/** Terminal operations are acknowledged (dismissed) when the user leaves. */
export const shouldDismissOnClose = (
  operation: CollectiblesPackOperation | undefined,
): boolean =>
  !operation ||
  operation.status === 'opened' ||
  operation.status === 'expired' ||
  operation.status === 'failed';
