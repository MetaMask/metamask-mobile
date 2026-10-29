import type { AutorampDepositInstructions } from '@metamask/ramps-controller';

// Session-only on purpose: deposit details include the Pix code and key, so
// they are not written to disk. Reopening the screen renders from here while
// a background fetch revalidates.
const cache = new Map<string, AutorampDepositInstructions>();

export const getCachedDepositInstructions = (
  autorampId: string | undefined,
): AutorampDepositInstructions | null =>
  (autorampId ? cache.get(autorampId) : undefined) ?? null;

export const setCachedDepositInstructions = (
  autorampId: string,
  instructions: AutorampDepositInstructions,
): void => {
  cache.set(autorampId, instructions);
};

export const clearCachedDepositInstructions = (): void => {
  cache.clear();
};
