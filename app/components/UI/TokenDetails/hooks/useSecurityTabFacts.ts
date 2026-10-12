import { useMemo } from 'react';
import type { TokenSecurityData } from '@metamask/assets-controllers';

import type { SecurityTabFacts } from '../components/V1/SecurityTab/SecurityTab.types';
import {
  deriveSecurityFacts,
  emptySecurityFacts,
} from '../utils/securityFacts';

interface UseSecurityTabFactsOpts {
  /** `null` once the request settled with no entry for this token. */
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Everything the Security surfaces render for a token, already formatted.
 *
 * The Security tab, the Contract security screen and the hero pill all call
 * this rather than reading the payload themselves, which is what stops them
 * showing different readings for the same token — the screen is reached from
 * the tab, so a disagreement would be visible in a single gesture.
 *
 * Takes the resolved request rather than fetching, so the one `/assets` call
 * `TokenDetailsV1` already makes for social links feeds every surface and the
 * detail screen adds no second round trip.
 *
 * The three outcomes map to three verdicts, which the pill already draws:
 *
 * - in flight, or no entry in the response -> `pending`
 * - the request failed -> `unscreened`, because a token we could not ask
 * about is indistinguishable from one nobody has screened
 * - a payload -> whatever `resultType` says
 *
 * Loading and no-data deliberately share `pending`. Both mean "no answer yet",
 * and splitting them would put a second neutral state on screen that says the
 * same thing in different words.
 */
export const useSecurityTabFacts = ({
  securityData,
  isLoading,
  error,
}: UseSecurityTabFactsOpts): SecurityTabFacts =>
  useMemo(() => {
    if (error) {
      return emptySecurityFacts('unscreened');
    }
    if (isLoading || !securityData) {
      return emptySecurityFacts('pending');
    }
    return deriveSecurityFacts(securityData);
  }, [securityData, isLoading, error]);
