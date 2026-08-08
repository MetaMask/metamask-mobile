import { useMemo } from 'react';
import type { SimilarAddressMatch } from '@metamask/phishing-controller';
import Engine from '../../../../../core/Engine';

interface AddressPoisoningDetectionResult {
  isPoisoningSuspect: boolean;
  bestMatch: SimilarAddressMatch | null;
  matches: SimilarAddressMatch[];
}

export function useAddressPoisoningDetection(
  toAddress: string | undefined,
): AddressPoisoningDetectionResult {
  return useMemo(() => {
    if (!toAddress) {
      return { isPoisoningSuspect: false, bestMatch: null, matches: [] };
    }

    const matches =
      Engine.context.PhishingController.checkAddressPoisoning(toAddress);

    return {
      isPoisoningSuspect: matches.length > 0,
      bestMatch: matches[0] ?? null,
      matches,
    };
  }, [toAddress]);
}
