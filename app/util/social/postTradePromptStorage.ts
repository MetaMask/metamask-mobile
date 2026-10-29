import { SOCIAL_POST_TRADE_PROMPTS } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

export type PostTradePromptProduct = 'swap' | 'perps';

interface PostTradePromptState {
  /** Share sheets completed per product, keyed by lowercased linked EVM address. */
  shareSheetCounts: Record<
    string,
    Partial<Record<PostTradePromptProduct, number>>
  >;
  /** One-time claim-username sheets already shown on this device. */
  claimSheetSeen: Partial<Record<PostTradePromptProduct, boolean>>;
}

const emptyState = (): PostTradePromptState => ({
  shareSheetCounts: {},
  claimSheetSeen: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readState = (): PostTradePromptState => {
  const stored = StorageWrapper.getItemSync(SOCIAL_POST_TRADE_PROMPTS);
  if (!stored) {
    return emptyState();
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) {
      return emptyState();
    }
    return {
      shareSheetCounts: isRecord(parsed.shareSheetCounts)
        ? (parsed.shareSheetCounts as PostTradePromptState['shareSheetCounts'])
        : {},
      claimSheetSeen: isRecord(parsed.claimSheetSeen)
        ? (parsed.claimSheetSeen as PostTradePromptState['claimSheetSeen'])
        : {},
    };
  } catch {
    return emptyState();
  }
};

/**
 * Storage failures must not affect the user's trade, so both synchronous and
 * asynchronous errors are ignored. The worst case is one extra prompt.
 */
const writeState = (state: PostTradePromptState): void => {
  try {
    StorageWrapper.setItem(
      SOCIAL_POST_TRADE_PROMPTS,
      JSON.stringify(state),
    )?.catch(() => undefined);
  } catch {
    // Ignored, see above.
  }
};

const addressKey = (address: string): string => address.trim().toLowerCase();

export const getShareSheetCount = (
  address: string,
  product: PostTradePromptProduct,
): number => {
  const count = readState().shareSheetCounts[addressKey(address)]?.[product];
  return typeof count === 'number' && Number.isFinite(count) && count > 0
    ? count
    : 0;
};

export const incrementShareSheetCount = (
  address: string,
  product: PostTradePromptProduct,
): void => {
  const state = readState();
  const key = addressKey(address);
  state.shareSheetCounts[key] = {
    ...state.shareSheetCounts[key],
    [product]: getShareSheetCount(address, product) + 1,
  };
  writeState(state);
};

export const hasSeenClaimSheet = (product: PostTradePromptProduct): boolean =>
  readState().claimSheetSeen[product] === true;

export const markClaimSheetSeen = (product: PostTradePromptProduct): void => {
  const state = readState();
  state.claimSheetSeen = { ...state.claimSheetSeen, [product]: true };
  writeState(state);
};
