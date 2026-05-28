import { BRIDGE_MM_FEE_RATE } from '@metamask/bridge-controller';
import { isNullOrUndefined } from '@metamask/utils';

/**
 * Resolves the MM fee % from quote metadata, falling back to the default bridge rate.
 *
 * `quoteBpsFee` is not yet reflected in the bridge-controller TS types but is
 * returned by the API at runtime — see the same @ts-expect-error pattern in
 * BridgeViewFooter.tsx.  We widen `metabridge` to `unknown` so any real quote
 * is accepted, then extract the field via a safe runtime cast.
 */
export function getMetamaskFeePercent(
  activeQuote:
    | { quote?: { feeData?: { metabridge?: unknown } } }
    | null
    | undefined,
): number {
  const metabridge = activeQuote?.quote?.feeData?.metabridge as
    | { quoteBpsFee?: number }
    | undefined;
  const quoteBpsFee = metabridge?.quoteBpsFee;
  if (!isNullOrUndefined(quoteBpsFee)) {
    return quoteBpsFee / 100;
  }
  return BRIDGE_MM_FEE_RATE;
}
