import { useTraderPositions } from '../TraderProfileView/hooks/useTraderPositions';

/**
 * Composer position picker: Clicker open/closed lists from social-api.
 * Wallet-only PerpsController rows are not included — they have no
 * `positionUid` and cannot be posted.
 */
export const useComposerSharePositions = useTraderPositions;
