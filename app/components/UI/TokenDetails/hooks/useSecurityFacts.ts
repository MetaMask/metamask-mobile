import { useMemo } from 'react';
import type { TokenSecurityData } from '@metamask/assets-controllers';

import type { SecurityFacts } from '../components/V1/SecurityTab/SecurityTab.types';
import {
  deriveSecurityFacts,
  emptySecurityFacts,
} from '../utils/securityFacts';

interface UseSecurityFactsOpts {
  /** `null` once the request settled with no entry for this token. */
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * What Blockaid concluded about a token.
 *
 * The Security tab, the Contract security screen and the hero pill all call
 * this rather than reading the payload themselves, which is what stops them
 * judging the same token differently — the screen is reached from the tab, so
 * a disagreement would be visible in a single gesture.
 *
 * Judgement only. The figures the same payload carries go through
 * `useTokenStats`, which the stat bar reads too.
 *
 * Takes the resolved request rather than fetching, so the `/assets` call
 * `TokenDetailsV1` already makes feeds every surface.
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
export const useSecurityFacts = ({
  securityData,
  isLoading,
  error,
}: UseSecurityFactsOpts): SecurityFacts =>
  useMemo(() => {
    if (error) {
      return emptySecurityFacts('unscreened');
    }
    if (isLoading || !securityData) {
      return emptySecurityFacts('pending');
    }
    return deriveSecurityFacts(securityData);
  }, [securityData, isLoading, error]);
